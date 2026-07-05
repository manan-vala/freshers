import { Request, Response, NextFunction } from 'express'
import * as roomService from './room.service'
import { parse } from 'csv-parse/sync'
import { AppError } from '@/utils/errors'
import { roomInventoryUploadRowSchema, buildRoomNumber } from '@shared/room'

export async function getRoomsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { hostelId } = req.query;
    if (!hostelId || typeof hostelId !== 'string') {
      res.status(400).json({ success: false, message: 'hostelId query parameter is required', errorCode: 'HOSTEL_NOT_FOUND' });
      return;
    }
    const rooms = await roomService.getRoomsForHostel(hostelId);
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
}

export async function createRoomHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const room = await roomService.createRoom(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message, errorCode: error.errorCode || 'UNKNOWN_ERROR' });
      return;
    }
    next(error);
  }
}

export async function updateRoomHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const room = await roomService.updateRoom(id, req.body);
    res.status(200).json({ success: true, data: room });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message, errorCode: error.errorCode || 'UNKNOWN_ERROR' });
      return;
    }
    next(error);
  }
}

export async function deactivateRoomHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const room = await roomService.deactivateRoom(id);
    res.status(200).json({ success: true, data: room });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message, errorCode: error.errorCode || 'UNKNOWN_ERROR' });
      return;
    }
    next(error);
  }
}

const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // IE/Edge sends this for .csv files
  'text/plain', // some OS/browsers send .csv as text/plain
]);

export async function bulkUploadRoomsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { hostelId } = req.query;
    if (!hostelId || typeof hostelId !== 'string') {
      throw new AppError(400, 'hostelId query parameter is required', 'HOSTEL_NOT_FOUND');
    }

    if (!req.file) {
      throw new AppError(400, 'No file uploaded. Attach a CSV as multipart field "file".');
    }

    if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
      throw new AppError(400, `Invalid file type "${req.file.mimetype}". Upload a .csv file.`);
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (req.file.size > MAX_BYTES) {
      throw new AppError(400, 'File exceeds 5 MB limit.');
    }

    let records: unknown[];
    try {
      records = parse(req.file.buffer, {
        columns: true, // use header row as keys
        skip_empty_lines: true,
        trim: true,
        bom: true, // handle Excel BOM
        relax_column_count: true,
      });
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      throw new AppError(400, `CSV parse error: ${msg}`);
    }

    const MAX_ROWS = 2000;
    if (records.length === 0) {
      throw new AppError(400, 'The CSV file is empty.');
    }
    if (records.length > MAX_ROWS) {
      throw new AppError(400, `CSV contains ${records.length} rows. Maximum allowed is ${MAX_ROWS}.`);
    }

    const validatedRows = [];
    const rowErrors: Array<{ row: number; roomNumber: string; reason: string; type: 'VALIDATION' | 'INTRA_CSV_DUPLICATE' | 'ALREADY_EXISTS' | 'OCCUPIED_CONFLICT' | 'DB_ERROR' }> = [];
    
    const seenRoomNumbers = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const parsed = roomInventoryUploadRowSchema.safeParse(records[i]);
      if (!parsed.success) {
        rowErrors.push({
          row: i + 1,
          roomNumber: 'N/A',
          reason: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
          type: 'VALIDATION'
        });
      } else {
        const rowData = parsed.data;
        const roomNumber = buildRoomNumber(rowData.prefix, rowData.suffix);
        
        if (seenRoomNumbers.has(roomNumber)) {
          rowErrors.push({
            row: i + 1,
            roomNumber,
            reason: 'Duplicate room number found within the CSV file',
            type: 'INTRA_CSV_DUPLICATE'
          });
        } else {
          seenRoomNumbers.add(roomNumber);
          validatedRows.push({ row: i + 1, roomNumber, capacity: rowData.capacity });
        }
      }
    }

    if (rowErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: `Validation failed on ${rowErrors.length} row(s). Fix and re-upload.`,
        errors: rowErrors,
      });
      return;
    }

    const result = await roomService.bulkUpsertRooms(hostelId, validatedRows, req.user!.sub);
    
    res.status(200).json({
      success: true,
      message: `${result.successCount} rooms added, ${result.skippedCount} skipped, ${result.failureCount} failed.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
