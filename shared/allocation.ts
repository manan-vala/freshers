import { z } from 'zod';

export const allocationSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  roomId: z.string().min(1, 'Room selection is required'),
  notes: z.string().optional().nullable(),
});

export type AllocationInput = z.infer<typeof allocationSchema>;

export const roomChangeSchema = z.object({
  newRoomId: z.string().min(1, 'New Room ID is required'),
  notes: z.string().optional().nullable(),
});

export type RoomChangeInput = z.infer<typeof roomChangeSchema>;

export const roommateSwapSchema = z.object({
  studentIdA: z.string().min(1, 'Student ID A is required'),
  studentIdB: z.string().min(1, 'Student ID B is required'),
  notes: z.string().optional().nullable(),
});

export type RoommateSwapInput = z.infer<typeof roommateSwapSchema>;
