/**
 * Admin & Moderator RBAC Middleware
 * Role-based access control for admin endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from './errorHandler';

/**
 * Check if user is an admin (ADMIN role only)
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return next(new AppError('Authentication required', 401));
    }

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { role: true, status: true },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.status !== 'ACTIVE') {
      return next(new AppError('Account is not active', 403));
    }

    if (user.role !== 'ADMIN') {
      return next(
        new AppError('Access denied. Admin privileges required.', 403)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user is an admin or moderator
 */
export const requireModerator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return next(new AppError('Authentication required', 401));
    }

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { role: true, status: true },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.status !== 'ACTIVE') {
      return next(new AppError('Account is not active', 403));
    }

    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return next(
        new AppError('Access denied. Moderator privileges required.', 403)
      );
    }

    // Attach role to request for further use
    (req as any).userRole = user.role;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has one of the allowed roles
 */
export const requireRole = (...roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return next(new AppError('Authentication required', 401));
      }

      const user = await prisma.user.findUnique({
        where: { userId },
        select: { role: true, status: true },
      });

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      if (user.status !== 'ACTIVE') {
        return next(new AppError('Account is not active', 403));
      }

      if (!roles.includes(user.role)) {
        return next(
          new AppError(
            `Access denied. Required role: ${roles.join(' or ')}`,
            403
          )
        );
      }

      // Attach role to request for further use
      (req as any).userRole = user.role;

      next();
    } catch (error) {
      next(error);
    }
  };
};
