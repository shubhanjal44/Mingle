// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError, InternalServerError } from '../utils/errors';

// Centralized error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err); // Log the error for debugging

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'fail',
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation error',
      errors: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  // Generic error for unhandled exceptions
  const internalError = new InternalServerError();
  res.status(internalError.statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};