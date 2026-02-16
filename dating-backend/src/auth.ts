// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

// Extend the Request object to include the user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string; // Assuming UserRole enum is string
        name: string; // Added name to the request user object
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('Not authenticated. No token provided.'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string; role: string; iat: number; exp: number };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, email: true, role: true, name: true } });

    if (!user) {
      return next(new UnauthorizedError('The user belonging to this token no longer exists.'));
    }
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) return next(new UnauthorizedError('Invalid token. Please log in again.'));
    if (err instanceof jwt.TokenExpiredError) return next(new UnauthorizedError('Token expired. Please log in again.'));
    next(new UnauthorizedError('Not authenticated.'));
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }
    next();
  };
};