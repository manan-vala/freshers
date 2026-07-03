import { prisma } from '@/config/prisma'
import { AppError } from '@/utils/errors'

export async function getOnboardedStudents(search?: string) {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } })
  if (!activeYear) throw new AppError(500, 'No active academic year found')

  return prisma.student.findMany({
    where: {
      academicYearId: activeYear.id,
      onboardingStatus: 'SUBMITTED',
      OR: search ? [
        { name: { contains: search, mode: 'insensitive' } },
        { contactNumber: { contains: search } }
      ] : undefined
    },
    include: {
      hostel: true,
      allocation: {
        include: {
          room: {
            include: {
              hostel: true
            }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
}

export async function verifyStudent(studentId: string, isVerified: boolean, needsReview: boolean) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  return prisma.student.update({
    where: { id: studentId },
    data: {
      isVerified,
      needsReview
    }
  });
}
