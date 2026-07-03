import { prisma } from '@/config/prisma';
import { emailQueue } from '@/modules/email/email.queue';
import { hashPassword } from '@/utils/password.util';
import { AppError } from '@/utils/errors';
import { randomBytes } from 'crypto';
import type { HostelName } from '../../../generated/prisma';

export async function createUser(data: {
  email: string;
  loginId: string;
  role?: 'STUDENT' | 'HMC' | 'ADMIN';
  studentData?: {
    name: string;
    rollNumber: string;
    branch: string;
    hostelCode: string;
    outlookEmail: string;
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
                branch: data.studentData.branch,
                outlookEmail: data.studentData.outlookEmail,
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
  const plainPassword = randomBytes(8).toString('hex');
  const passwordHash = await hashPassword(plainPassword);

  const user = await prisma.$transaction(async (tx) => {
    // 1. Create the base User row
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        loginId: data.loginId,
        passwordHash,
        role: data.role,
        mustChangePassword: true,
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

  // 3. Queue credential email AFTER transaction commits successfully
  await emailQueue.add('credential', {
    to: user.email,
    templateId: 'credentials',
    data: { loginId: user.loginId, password: plainPassword },
  });

  return user;
}

import type { BulkUploadRow } from '@shared/student';

export async function bulkUploadStudents(rows: BulkUploadRow[], uploadedBy: string) {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) throw new Error('No active academic year found');

  let successCount = 0;
  let failureCount = 0;
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await createUser({
        email: row.email,
        loginId: row.rollNumber, // Use roll number as login ID by default
        role: 'STUDENT',
        studentData: {
          name: row.name,
          rollNumber: row.rollNumber,
          branch: row.branch,
          hostelCode: row.hostelCode,
          outlookEmail: row.outlookEmail,
          academicYearId: activeYear.id,
        },
      });
      successCount++;
    } catch (error: any) {
      failureCount++;
      errors.push({ row: i + 1, reason: error.message || 'Unknown error' });
    }
  }

  return { successCount, failureCount, errors };
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
