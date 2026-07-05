import { z } from 'zod';

export const createRoomSchema = z.object({
  hostelId: z.string().min(1, 'Hostel ID is required'),
  roomNumber: z.string().min(1, 'Room Number is required').max(20),
  capacity: z.number().int().min(1).max(10),
  isAccessible: z.boolean().optional().default(false),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = createRoomSchema.partial().omit({ hostelId: true, roomNumber: true }).extend({
  isActive: z.boolean().optional(),
});

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const roomInventoryUploadRowSchema = z.object({
  prefix: z
    .string()
    .min(1, 'Prefix is required')
    .max(10, 'Prefix cannot exceed 10 characters')
    .regex(/^[A-Za-z]+$/, 'Prefix must contain only letters (A–Z)'),
  suffix: z
    .string()
    .min(1, 'Suffix is required')
    .regex(/^\d+$/, 'Suffix must contain only digits'),
  capacity: z.coerce
    .number({ invalid_type_error: 'Capacity must be a number' })
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be at least 1')
    .max(10, 'Capacity cannot exceed 10'),
});

export type RoomInventoryUploadRow = z.infer<typeof roomInventoryUploadRowSchema>;

export function buildRoomNumber(prefix: string, suffix: string): string {
  return `${prefix.toUpperCase()}-${suffix}`;
}

export type RoomImportResult = {
  successCount: number;
  skippedCount: number;
  failureCount: number;
  errors: Array<{
    row: number;
    roomNumber: string;
    reason: string;
    type: 'VALIDATION' | 'INTRA_CSV_DUPLICATE' | 'ALREADY_EXISTS' | 'OCCUPIED_CONFLICT' | 'DB_ERROR';
  }>;
  skipped: Array<{
    row: number;
    roomNumber: string;
    reason: string;
  }>;
};
