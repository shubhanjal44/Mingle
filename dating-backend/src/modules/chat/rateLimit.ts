// src/middleware/rateLimit.ts
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors';

// In-memory store for rate limiting. In a real app, use Redis.
const rateLimitStore = new Map<string, number[]>(); // Key: userId:actionType, Value: array of timestamps

interface RateLimitOptions {
  limit: number; // Max requests
  windowMs: number; // Time window in milliseconds
  message?: string;
}

export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const { limit, windowMs, message = 'Too many requests, please try again later.' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return next(new BadRequestError('User ID not found for rate limiting.'));
    }

    const userId = req.user.id;
    const key = `${userId}:${req.method}:${req.path}`; // Unique key for this user and action
    const now = Date.now();

    let timestamps = rateLimitStore.get(key) || [];

    // Remove expired timestamps
    timestamps = timestamps.filter(timestamp => timestamp > now - windowMs);

    if (timestamps.length >= limit) {
      return res.status(429).json({
        status: 'fail',
        message: message,
      });
    }

    timestamps.push(now);
    rateLimitStore.set(key, timestamps);
    next();
  };
};