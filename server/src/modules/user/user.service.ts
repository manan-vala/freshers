import { prisma } from '@/config/prisma';
import { emailQueue } from '@/modules/email/email.queue';
import { hashPassword } from '@/utils/password.util';
import { AppError } from '@/utils/errors';
import { randomBytes } from 'crypto';
import type { HostelName } from '@/generated/prisma/enums';

export async function createUser(data: {
  email: string;
  loginId: string;
  role?: 'STUDENT' | 'HMC' | 'ADMIN';
  studentData?: {
    name: string;
    rollNumber: string;
    discipline: string;
    programme: string;
    hostelCode: string;
    gmailId: string;
    outlookId: string;
    academicYearId: string;
  };
}) {
  const plainPassword = randomBytes(8).toString('hex');
  const passwordHash = await hashPassword(plainPassword);

  let hostelId: string | undefined;

  if (data.studentData?.hostelCode) {
    const hostel = await prisma.hostel.findFirst({
      where: { code: data.studentData.hostelCode, academicYearId: data.studentData.academicYearId },
    });
    if (!hostel) {
      throw new Error(`Hostel with code ${data.studentData.hostelCode} not found for this academic year`);
    }
    hostelId = hostel.id;
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      loginId: data.loginId,
      passwordHash,
      role: data.role || 'STUDENT',
      mustChangePassword: true,
      ...(data.studentData && hostelId
        ? {
            student: {
              create: {
                name: data.studentData.name,
                rollNumber: data.studentData.rollNumber,
                discipline: data.studentData.discipline,
                programme: data.studentData.programme,
                gmailId: data.studentData.gmailId,
                outlookId: data.studentData.outlookId,
                academicYearId: data.studentData.academicYearId,
                hostelId: hostelId,
                onboardingStatus: 'PENDING',
              },
            },
          }
        : {}),
    },
  });

  await emailQueue.add('credential', {
    to: user.email,
    templateId: 'credentials',
    data: { loginId: user.loginId, password: plainPassword },
  });

  return user;
}

// ─── CREATE ADMIN / HMC USER ─────────────────────────────────────────────────
// Wraps User creation + HMCAdmin linking in a single transaction.
// If any step fails, the whole operation rolls back — no zombie User rows.
export async function createAdminUser(data: {
  email: string;
  loginId: string;
  role: 'HMC' | 'ADMIN';
  hostelName?: HostelName;  // Required when role === 'HMC'
}) {
  // HMC admins authenticate via Microsoft OAuth exclusively — no password is ever used.
  // We still hash a random value to satisfy the non-nullable DB column.
  const passwordHash = await hashPassword(randomBytes(16).toString('hex'));

  const user = await prisma.$transaction(async (tx) => {
    // 1. Create the base User row
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        loginId: data.loginId,
        passwordHash,
        role: data.role,
        mustChangePassword: false, // Irrelevant — login is handled by Microsoft OAuth
        isActive: true,
      },
    });

    // 2. If HMC role, link to hostel atomically in the same transaction
    if (data.role === 'HMC') {
      if (!data.hostelName) {
        throw new AppError(400, 'hostelName is required for HMC role');
      }

      const activeYear = await tx.academicYear.findFirst({ where: { isActive: true } });
      if (!activeYear) {
        throw new AppError(400, 'No active academic year found. Create one before provisioning HMC admins.');
      }

      const hostel = await tx.hostel.findFirst({
        where: { name: data.hostelName, academicYearId: activeYear.id },
      });
      if (!hostel) {
        throw new AppError(
          404,
          `Hostel "${data.hostelName}" not found for the active academic year. Create the hostel first.`
        );
      }

      await tx.hMCAdmin.create({
        data: { userId: newUser.id, hostelId: hostel.id },
      });
    }

    return newUser;
  });

  // No credential email is sent — HMC admins log in via Microsoft OAuth.
  // Their provisioned account is activated; they simply hit "Login with Microsoft" to access the dashboard.

  return user;
}

import type { BulkUploadRow } from '@shared/student'
import { studentImportQueue } from '@/jobs/studentImport.queue'

// Enqueue an import job. Called by the controller immediately after CSV parsing.
// Returns the BullMQ job ID so the client can poll status.
export async function enqueueStudentImport(
  rows: BulkUploadRow[],
  uploadedBy: string
): Promise<string> {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } })
  if (!activeYear) {
    throw new AppError(400, 'No active academic year found. Create one before importing students.')
  }

  const job = await studentImportQueue.add('import', {
    rows,
    uploadedBy,
    academicYearId: activeYear.id,
  })

  // job.id is always a string when the queue uses the default ID generator
  return job.id!
}

// Fetch the current status of an import job.
// Returns a consistent shape regardless of job state.
export async function getImportJobStatus(jobId: string) {
  const job = await studentImportQueue.getJob(jobId)
  if (!job) {
    throw new AppError(404, 'Import job not found. It may have expired.')
  }

  const state = await job.getState()

  return {
    state,
    progress: job.progress as number,
    result: state === 'completed' ? (job.returnvalue ?? null) : null,
    failedReason: state === 'failed' ? (job.failedReason ?? null) : null,
  }
}

export async function getAllStudents(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}) {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) {
    throw new AppError(400, 'No active academic year found');
  }

  const { page, limit, search, status } = params;
  const skip = (page - 1) * limit;

  // Build the where clause
  const where: any = {
    academicYearId: activeYear.id,
  };

  if (status) {
    where.onboardingStatus = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { rollNumber: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { gmailId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: { select: { email: true, isActive: true } },
        hostel: { select: { name: true, code: true } },
        allocation: { select: { id: true, isActive: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.student.count({ where }),
  ]);

  return {
    data: students,
    total,
    page,
    limit,
  };
}
