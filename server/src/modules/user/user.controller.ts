import { Request, Response, NextFunction } from 'express'
import { parse } from 'csv-parse/sync'
import { prisma } from '@/config/prisma'
import { createAdminUser, getAllStudents, enqueueStudentImport, getImportJobStatus, exportAllStudents } from './user.service'
import { seedPersonas } from './seed.service'
import { bulkUploadRowSchema } from '@shared/student'
import { AppError } from '@/utils/errors'
import type { HostelName } from '@/generated/prisma/enums'

export async function createAdminUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, loginId, role, hostelName } = req.body;

    if (role !== 'HMC' && role !== 'ADMIN') {
      throw new AppError(400, 'Invalid role for admin creation');
    }

    if (role === 'HMC' && !hostelName) {
      throw new AppError(400, 'hostelName is required for HMC role');
    }

    // Delegate entirely to the service — transaction guarantees no zombie User rows
    const user = await createAdminUser({
      email,
      loginId,
      role,
      hostelName: hostelName as HostelName | undefined,
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}


export async function getHMCUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'HMC', deletedAt: null },
      select: {
        id: true,
        email: true,
        loginId: true,
        hmcAdmin: {
          select: {
            hostel: {
              select: { id: true, code: true, name: true }
            }
          }
        }
      }
    });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

export async function deleteHMCUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;

    // Hard delete for simplicity since it's an admin, or soft delete.
    // Assuming hard delete is fine, or we soft delete.
    // The user model has deletedAt. Let's do soft delete.
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const timestamp = Date.now();
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        email: `${user.email}_deleted_${timestamp}`,
        loginId: `${user.loginId}_deleted_${timestamp}`,
        microsoftId: null
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}


// ─── Allowed MIME types ───────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // IE/Edge sends this for .csv files
  'text/plain', // some OS/browsers send .csv as text/plain
])

export async function bulkUploadStudentsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // ── Guard: file present ───────────────────────────────────────────────────
    if (!req.file) {
      throw new AppError(400, 'No file uploaded. Attach a CSV as multipart field "file".')
    }

    // ── Guard: MIME type ──────────────────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
      throw new AppError(400, `Invalid file type "${req.file.mimetype}". Upload a .csv file.`)
    }

    // ── Guard: file size (belt-and-suspenders — multer limits set on the route) ─
    const MAX_BYTES = 5 * 1024 * 1024
    if (req.file.size > MAX_BYTES) {
      throw new AppError(400, 'File exceeds 5 MB limit.')
    }

    // ── Parse CSV ─────────────────────────────────────────────────────────────
    let records: unknown[]
    try {
      records = parse(req.file.buffer, {
        columns: true, // use header row as keys
        skip_empty_lines: true,
        trim: true,
        bom: true, // handle Excel BOM (UTF-8 BOM)
        relax_column_count: true, // don't crash on trailing commas
      })
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : 'Unknown parse error'
      throw new AppError(400, `CSV parse error: ${msg}`)
    }

    // ── Guard: row count ──────────────────────────────────────────────────────
    const MAX_ROWS = 5_000
    if (records.length === 0) {
      throw new AppError(400, 'The CSV file is empty.')
    }
    if (records.length > MAX_ROWS) {
      throw new AppError(400, `CSV contains ${records.length} rows. Maximum allowed is ${MAX_ROWS}.`)
    }

    // ── Validate every row with Zod ───────────────────────────────────────────
    // Fail fast: if ANY row is invalid, reject the entire upload before touching
    // the database. The admin must fix the CSV and re-upload.
    const validatedRows = []
    const rowErrors: { row: number; reason: string }[] = []

    for (let i = 0; i < records.length; i++) {
      const parsed = bulkUploadRowSchema.safeParse(records[i])
      if (!parsed.success) {
        rowErrors.push({
          row: i + 1,
          reason: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        })
      } else {
        validatedRows.push(parsed.data)
      }
    }

    // Return all validation errors at once — don't make the admin fix one row at a time
    if (rowErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: `CSV validation failed on ${rowErrors.length} row(s). Fix and re-upload.`,
        errors: rowErrors,
      })
      return
    }

    // ── Enqueue ───────────────────────────────────────────────────────────────
    const jobId = await enqueueStudentImport(validatedRows, req.user!.sub)

    // 202 Accepted — processing will happen asynchronously
    res.status(202).json({
      success: true,
      message: `${validatedRows.length} rows queued for import. Poll the status endpoint with the jobId.`,
      data: { jobId },
    })
  } catch (err) {
    next(err)
  }
}

export async function getImportStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { jobId } = req.params as { jobId: string }
    const status = await getImportJobStatus(jobId)

    res.status(200).json({ success: true, data: status })
  } catch (err) {
    next(err)
  }
}

export async function getAllStudentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await getAllStudents({ page, limit, search, status });

    res.status(200).json({
      success: true,
      ...result, // spreads data, total, page, limit
    });
  } catch (error) {
    next(error);
  }
}

export async function exportAllStudentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await exportAllStudents();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function seedPersonasHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { academicYear } = req.body;
    if (!academicYear || !/^\d{4}-\d{4}$/.test(academicYear)) {
      throw new AppError(400, 'Invalid academicYear format. Must be YYYY-YYYY (e.g. 2026-2027).');
    }
    const result = await seedPersonas(academicYear);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
