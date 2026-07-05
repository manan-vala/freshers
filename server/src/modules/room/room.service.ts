import { prisma } from '@/config/prisma'
import { AppError } from '@/utils/errors'
import type { CreateRoomInput, UpdateRoomInput, RoomImportResult } from '@shared/room'

export async function getRoomsForHostel(hostelId: string) {
  return await prisma.room.findMany({
    where: { hostelId },
    orderBy: { roomNumber: 'asc' }
  });
}

export async function createRoom(data: CreateRoomInput) {
  const existing = await prisma.room.findUnique({
    where: {
      hostelId_roomNumber: {
        hostelId: data.hostelId,
        roomNumber: data.roomNumber
      }
    }
  });

  if (existing) {
    throw new AppError(409, `Room ${data.roomNumber} already exists in this hostel`, 'ROOM_DUPLICATE');
  }

  return await prisma.room.create({
    data: {
      hostelId: data.hostelId,
      roomNumber: data.roomNumber,
      capacity: data.capacity,
      isAccessible: data.isAccessible ?? false,
      currentOccupancy: 0,
      isActive: true,
    }
  });
}

export async function updateRoom(roomId: string, data: UpdateRoomInput) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');

  if (data.capacity !== undefined && data.capacity < room.currentOccupancy) {
    throw new AppError(400, 'Cannot reduce capacity below current occupancy', 'CAPACITY_BELOW_OCCUPANCY');
  }

  if (data.isActive === false && room.currentOccupancy > 0) {
    throw new AppError(400, 'Cannot deactivate a room that is currently occupied', 'ROOM_OCCUPIED');
  }

  return await prisma.room.update({
    where: { id: roomId },
    data
  });
}

export async function deactivateRoom(roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');

  if (room.currentOccupancy > 0) {
    throw new AppError(400, 'Cannot deactivate a room that is currently occupied', 'ROOM_OCCUPIED');
  }

  return await prisma.room.update({
    where: { id: roomId },
    data: { isActive: false }
  });
}

export async function bulkUpsertRooms(
  hostelId: string,
  rows: Array<{ row: number; roomNumber: string; capacity: number }>,
  uploadedBy: string
): Promise<RoomImportResult> {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) throw new AppError(500, 'No active academic year found');

  const result: RoomImportResult = {
    successCount: 0,
    skippedCount: 0,
    failureCount: 0,
    errors: [],
    skipped: []
  };

  const roomNumbers = rows.map(r => r.roomNumber);
  
  const existingRooms = await prisma.room.findMany({
    where: {
      hostelId,
      roomNumber: { in: roomNumbers }
    }
  });

  const existingMap = new Map(existingRooms.map(r => [r.roomNumber, r]));
  const insertableRooms: typeof rows = [];

  for (const row of rows) {
    const existing = existingMap.get(row.roomNumber);
    if (existing) {
      if (existing.currentOccupancy > 0) {
        result.failureCount++;
        result.errors.push({
          row: row.row,
          roomNumber: row.roomNumber,
          reason: 'Room already exists and is currently occupied',
          type: 'OCCUPIED_CONFLICT'
        });
      } else {
        result.skippedCount++;
        result.skipped.push({
          row: row.row,
          roomNumber: row.roomNumber,
          reason: 'Room already exists'
        });
      }
    } else {
      insertableRooms.push(row);
    }
  }

  if (insertableRooms.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.room.createMany({
        data: insertableRooms.map(r => ({
          hostelId,
          roomNumber: r.roomNumber,
          capacity: r.capacity,
          isAccessible: false,
          currentOccupancy: 0,
          isActive: true
        })),
        skipDuplicates: true
      });
      
      await tx.bulkUploadLog.create({
        data: {
          uploadedBy,
          academicYearId: activeYear.id,
          type: 'HOSTEL_INVENTORY',
          fileName: 'room_inventory_upload.csv',
          totalRows: rows.length,
          successCount: insertableRooms.length,
          failureCount: result.failureCount,
          errors: result.errors
        }
      });
    });
    
    result.successCount += insertableRooms.length;
  }

  return result;
}
