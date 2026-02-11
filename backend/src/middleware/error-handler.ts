/**
 * Global Error Handler Middleware
 *
 * Catches and formats errors across the application
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, formatError, isOperationalError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error('Application error', {
        error: error.message,
        code: error.code,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userId: (req as any).user?.id,
      });
    } else {
      logger.warn('Client error', {
        error: error.message,
        code: error.code,
        url: req.url,
        method: req.method,
        userId: (req as any).user?.id,
      });
    }
  } else {
    logger.error('Unexpected error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id,
    });
  }

  // Format and send error response
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const formattedError = formatError(error);

  res.status(statusCode).json(formattedError);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new AppError(
    `Route ${req.method} ${req.url} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Process uncaught exceptions and unhandled rejections
 */
export function setupProcessErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
    });

    if (!isOperationalError(error)) {
      logger.error('Non-operational error detected. Shutting down...');
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });

    if (reason instanceof Error && !isOperationalError(reason)) {
      logger.error('Non-operational error detected. Shutting down...');
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
}
