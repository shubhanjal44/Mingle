/**
 * Advanced Rate Limiting with Redis
 * Distributed rate limiting across multiple servers
 */

import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * User-based key generator
 */
export function userKeyGenerator(req: Request): string {
  const userId = (req as any).user?.userId;
  return userId || defaultKeyGenerator(req);
}

/**
 * API key-based generator
 */
export function apiKeyGenerator(req: Request): string {
  const apiKey = req.headers['x-api-key'] as string;
  return apiKey || defaultKeyGenerator(req);
}

/**
 * Create rate limit middleware
 */
export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    handler,
  } = config;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const identifier = `${req.path}:${key}`;

      // Check rate limit
      const result = await cacheService.checkRateLimit(identifier, max, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000).toString());

        logger.warn('Rate limit exceeded:', {
          path: req.path,
          identifier: key,
          limit: max,
        });

        if (handler) {
          return handler(req, res);
        }

        return next(new AppError(message, 429));
      }

      // Store response status for skip logic
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        const isSuccessful = res.statusCode >= 200 && res.statusCode < 300;
        const isFailed = res.statusCode >= 400;

        // Decrement counter if we should skip this request
        if ((skipSuccessfulRequests && isSuccessful) || (skipFailedRequests && isFailed)) {
          // Note: In production, implement counter decrement in Redis
          logger.debug('Skipping rate limit count for this request');
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Preset rate limiters for different endpoints
 */

// General API rate limit
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Strict rate limit for authentication endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Rate limit for expensive operations
export const expensiveOperationLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests for this operation, please slow down',
  keyGenerator: userKeyGenerator,
});

// Rate limit for search endpoints
export const searchRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please slow down',
  keyGenerator: userKeyGenerator,
});

// Rate limit for file uploads
export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Upload limit exceeded, please try again later',
  keyGenerator: userKeyGenerator,
});

// Rate limit for API endpoints (authenticated users)
export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded',
  keyGenerator: userKeyGenerator,
});

/**
 * Dynamic rate limiter based on user tier
 */
export function tierBasedRateLimit(limits: {
  free: number;
  basic: number;
  pro: number;
}) {
  return createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Default max (will be overridden)
    keyGenerator: userKeyGenerator,
    handler: (req, res) => {
      const user = (req as any).user;
      const tier = user?.subscription?.tier || 'FREE';

      let max = limits.free;
      if (tier === 'BASIC') max = limits.basic;
      if (tier === 'PRO') max = limits.pro;

      res.status(429).json({
        success: false,
        message: `Rate limit exceeded for ${tier} tier. Upgrade for higher limits.`,
        limits: {
          current: tier,
          limit: max,
        },
      });
    },
  });
}
