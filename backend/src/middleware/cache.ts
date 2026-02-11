/**
 * Cache Middleware
 * Middleware for caching API responses
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
  const userId = (req as any).user?.userId || 'anonymous';
  const path = req.originalUrl || req.url;
  const method = req.method;
  const query = JSON.stringify(req.query);

  return `api:${method}:${path}:${userId}:${query}`;
}

/**
 * Cache middleware factory
 */
export function cacheMiddleware(ttl: number = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if Redis is not connected
    if (!redis.isReady()) {
      logger.debug('Redis not ready, skipping cache middleware');
      return next();
    }

    const cacheKey = generateCacheKey(req);

    try {
      // Try to get cached response
      const cachedResponse = await redis.get(cacheKey);

      if (cachedResponse) {
        logger.debug(`Cache HIT for ${cacheKey}`);
        const data = JSON.parse(cachedResponse);

        return res.status(200).json({
          ...data,
          cached: true,
          cacheTime: new Date().toISOString(),
        });
      }

      logger.debug(`Cache MISS for ${cacheKey}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function (body: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.set(cacheKey, JSON.stringify(body), ttl).catch((error) => {
            logger.error('Failed to cache response:', error);
          });
        }

        // Call original json method
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 * Invalidates cache after mutations (POST, PUT, DELETE)
 */
export function invalidateCacheMiddleware(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after response
    res.json = function (body: any) {
      // Invalidate cache after successful mutation
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          for (const pattern of patterns) {
            try {
              const count = await redis.delPattern(`api:*${pattern}*`);
              logger.debug(`Invalidated ${count} cache entries matching ${pattern}`);
            } catch (error) {
              logger.error(`Failed to invalidate cache for pattern ${pattern}:`, error);
            }
          }
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * No-cache middleware
 * Explicitly prevent caching for sensitive endpoints
 */
export function noCache(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

/**
 * Cache control middleware
 * Set cache control headers for client-side caching
 */
export function cacheControl(maxAge: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
}
