import { prisma } from '@/config/prisma';
import { emailQueue } from '@/modules/email/email.queue';
import { hashPassword } from '@/utils/password.util';
import { randomBytes } from 'crypto';

export async function createUser(data: {
  email: string;
  loginId: string;
  role?: 'STUDENT' | 'HMC' | 'ADMIN';
  studentData?: {
    name: string;
    rollNumber: string;
    branch: string;
    hostelCode: string;
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
