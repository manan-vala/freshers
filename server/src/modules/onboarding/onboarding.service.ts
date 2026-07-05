import { prisma } from '@/config/prisma'
import { AppError } from '@/utils/errors'

export async function getOnboardedStudents(search?: string, hostelId?: string) {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } })
  if (!activeYear) throw new AppError(500, 'No active academic year found')

  return prisma.student.findMany({
    where: {
      academicYearId: activeYear.id,
      onboardingStatus: 'SUBMITTED',
      ...(hostelId && { hostelId }),
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

import type { OnboardingInput } from '@shared/student'

export async function submitOnboarding(userId: string, data: OnboardingInput) {
  // 1. Find the student record linked to this user
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError(404, 'Student record not found');

  // 2. Idempotency guard — block double-submission
  if (student.onboardingStatus === 'SUBMITTED' && !student.editAllowedByAdmin) {
    throw new AppError(409, 'Onboarding already submitted');
  }

  // 3. Map the validated payload to Prisma Student fields
  const country = data.country === 'Other' ? data.otherCountry! : data.country;

  const bloodGroupMap: Record<string, any> = {
    "A+": "A_POSITIVE",
    "A-": "A_NEGATIVE",
    "B+": "B_POSITIVE",
    "B-": "B_NEGATIVE",
    "O+": "O_POSITIVE",
    "O-": "O_NEGATIVE",
    "AB+": "AB_POSITIVE",
    "AB-": "AB_NEGATIVE",
  };

  return prisma.student.update({
    where: { userId },
    data: {
      contactNumber: data.phone, // the unified schema uses "phone"
      alternateContactNumber: data.emergencyPhone, // Let's use emergencyPhone as alternate
      permanentAddress: data.permanentAddress,
      country,
      state: data.state ?? null,
      emergencyContactName: data.emergencyContactName,
      emergencyContactNumber: data.emergencyPhone,
      emergencyContactRelation: data.emergencyContactRelation,
      bloodGroup: bloodGroupMap[data.bloodGroup] || data.bloodGroup,
      medicalConditions: data.medicalConditions ?? 'None',
      identificationMark: data.identificationMark ?? 'None',
      dob: data.dob,
      gender: data.gender,
      isHandicapped: data.isHandicapped,
      handicapDetails: data.handicapDetails ?? null,
      consentGiven: true,
      onboardingStatus: 'SUBMITTED',
      onboardingSubmittedAt: new Date(),
      editAllowedByAdmin: false,  // reset after re-submission if it was open
    },
    select: { id: true, onboardingStatus: true },
  });
}
