import { prisma } from '@/config/prisma'
import { AppError } from '@/utils/errors'
import type { AllocationInput } from '@shared/allocation'

export async function allocateRoom(input: AllocationInput, allocatedBy: string) {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) throw new AppError(500, 'No active academic year found');

  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new AppError(404, 'Student not found');
  if (student.onboardingStatus !== 'SUBMITTED') {
    throw new AppError(400, 'Student must submit onboarding before allocation');
  }
  if (!student.isVerified) {
    throw new AppError(400, 'Student must be verified before allocation');
  }

  if (student.hostelId !== input.hostelId) {
    throw new AppError(400, 'Hostel ID does not match student\'s pre-assigned hostel', 'HOSTEL_MISMATCH');
  }

  const existing = await prisma.allocation.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });
  if (existing) throw new AppError(409, 'Student already has an active allocation', 'ALREADY_ALLOCATED');

  const allocation = await prisma.$transaction(async (tx) => {
    const updated = await tx.room.updateMany({
      where: {
        id: input.roomId,
        hostelId: input.hostelId,
        isActive: true,
        currentOccupancy: { lt: prisma.room.fields.capacity }
      },
      data: { currentOccupancy: { increment: 1 } },
    });

    if (updated.count === 0) {
      const room = await tx.room.findUnique({ where: { id: input.roomId } });
      if (!room) throw new AppError(404, 'Selected room does not exist');
      if (room.hostelId !== input.hostelId) throw new AppError(400, 'Selected room does not belong to the correct hostel');
      if (!room.isActive) throw new AppError(400, 'Selected room is not available for allocation');
      throw new AppError(
        400,
        `Room ${room.roomNumber} is at capacity (${room.currentOccupancy}/${room.capacity}). Please select a different room.`
      );
    }

    const newAllocation = await tx.allocation.create({
      data: {
        studentId: input.studentId,
        hostelId: input.hostelId,
        roomId: input.roomId,
        notes: input.notes,
        allocatedBy,
        academicYearId: activeYear.id,
        isActive: true
      }
    });

    await tx.allocationAudit.create({
      data: {
        allocationId: newAllocation.id,
        academicYearId: activeYear.id,
        action: 'ALLOCATED',
        performedBy: allocatedBy,
        newRoomId: input.roomId,
      },
    });

    return newAllocation;
  });

  return allocation;
}
