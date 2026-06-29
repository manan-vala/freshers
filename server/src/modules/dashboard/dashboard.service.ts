import { prisma } from '@/config/prisma'
import { AppError } from '@/utils/errors'

export async function getHostelDashboardStats(userId: string) {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) throw new AppError(500, 'No active academic year found');

  const hmcAdmin = await prisma.hMCAdmin.findUnique({
    where: { userId },
    include: { hostel: true }
  });
  if (!hmcAdmin) throw new AppError(404, 'HMC Admin record not found');

  const hostelId = hmcAdmin.hostelId;

  // Total students verified (for all, wait, the request asks for total verified students, total needing review, total allocated for the admin's hostel)
  // Wait, the new plan:
  // "display all onboarded students' list to every hostel-admin"
  // "Dashboard Module: GET /v1/dashboard/hostel (Modified): Return stats including total verified students, total needing review, and total allocated for the admin's hostel."

  // Let's get total allocated to THIS hostel.
  const totalAllocated = await prisma.allocation.count({
    where: {
      hostelId,
      academicYearId: activeYear.id,
      isActive: true
    }
  });

  // What about total verified students? Are verified students tied to a hostel BEFORE allocation? No.
  // We can just return global stats for verified and needing review.
  const totalVerified = await prisma.student.count({
    where: { academicYearId: activeYear.id, isVerified: true, hostelId }
  });

  const totalNeedingReview = await prisma.student.count({
    where: { academicYearId: activeYear.id, needsReview: true, hostelId }
  });

  const totalOnboarded = await prisma.student.count({
    where: { academicYearId: activeYear.id, onboardingStatus: 'SUBMITTED', hostelId }
  });

  return {
    hostelName: hmcAdmin.hostel.name,
    totalAllocated,
    totalVerified,
    totalNeedingReview,
    totalOnboarded
  };
}
