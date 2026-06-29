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
    let room = await tx.room.findUnique({
      where: {
        hostelId_roomNumber: {
          hostelId: input.hostelId,
          roomNumber: input.roomNumber
        }
      }
    });

    if (!room) {
      room = await tx.room.create({
        data: {
          hostelId: input.hostelId,
          roomNumber: input.roomNumber,
          capacity: 2,
          currentOccupancy: 0
        }
      });
    }

    if (room.currentOccupancy >= room.capacity) {
      await tx.room.update({
        where: { id: room.id },
        data: { capacity: room.currentOccupancy + 1 }
      });
    }

    const newAllocation = await tx.allocation.create({
      data: {
        studentId: input.studentId,
        hostelId: input.hostelId,
        roomId: room.id,
        notes: input.notes,
        allocatedBy,
        academicYearId: activeYear.id,
        isActive: true
      }
    });

    await tx.room.update({
      where: { id: room.id },
      data: { currentOccupancy: { increment: 1 } },
    });

    await tx.allocationAudit.create({
      data: {
        allocationId: newAllocation.id,
        academicYearId: activeYear.id,
        action: 'ALLOCATED',
        performedBy: allocatedBy,
        newRoomId: room.id,
      },
    });

    return newAllocation;
  });

  return allocation;
}
