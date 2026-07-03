import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/prisma';
import { createUser, createAdminUser, bulkUploadStudents, getAllStudents } from './user.service';
import { AppError } from '@/utils/errors';
import type { HostelName } from '../../generated/prisma';

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

import { parse } from 'csv-parse/sync';
import { bulkUploadRowSchema } from '@shared/student';

export async function bulkUploadStudentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError(400, 'No file uploaded');
    }

    const fileContent = req.file.buffer.toString('utf-8');
    
    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Validate rows
    const validatedRows = [];
    for (let i = 0; i < records.length; i++) {
      const parsed = bulkUploadRowSchema.safeParse(records[i]);
      if (!parsed.success) {
        throw new AppError(400, `Validation error on row ${i + 1}: ${parsed.error.errors.map((e) => e.message).join(', ')}`);
      }
      validatedRows.push(parsed.data);
    }

    const result = await bulkUploadStudents(validatedRows, req.user!.id);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
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
