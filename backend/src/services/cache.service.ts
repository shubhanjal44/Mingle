/**
 * Cache Service
 * High-level caching abstraction with TTL strategies
 */

import { redis } from '../config/redis';
import { logger } from '../utils/logger';

// Cache TTL configurations (in seconds)
export const CacheTTL = {
  SHORT: 60 * 5, // 5 minutes
  MEDIUM: 60 * 30, // 30 minutes
  LONG: 60 * 60, // 1 hour
  VERY_LONG: 60 * 60 * 24, // 24 hours
  USER_SESSION: 60 * 60 * 24 * 7, // 7 days
} as const;

// Cache key prefixes for organization
export const CachePrefix = {
  USER: 'user:',
  SKILL: 'skill:',
  CATEGORY: 'category:',
  SWAP: 'swap:',
  EVENT: 'event:',
  NOTIFICATION: 'notification:',
  ANALYTICS: 'analytics:',
  SEARCH: 'search:',
  SESSION: 'session:',
  RATE_LIMIT: 'ratelimit:',
} as const;

class CacheService {
  /**
   * Generate cache key with prefix
   */
  private key(prefix: string, identifier: string): string {
    return `${prefix}${identifier}`;
  }

  /**
   * Cache user profile
   */
  async cacheUser(userId: string, userData: any): Promise<boolean> {
    const key = this.key(CachePrefix.USER, userId);
    return redis.setJSON(key, userData, CacheTTL.MEDIUM);
  }

  /**
   * Get cached user profile
   */
  async getUser(userId: string): Promise<any | null> {
    const key = this.key(CachePrefix.USER, userId);
    return redis.getJSON(key);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<boolean> {
    const key = this.key(CachePrefix.USER, userId);
    return redis.del(key);
  }

  /**
   * Cache skill categories
   */
  async cacheCategories(categories: any[]): Promise<boolean> {
    const key = this.key(CachePrefix.CATEGORY, 'all');
    return redis.setJSON(key, categories, CacheTTL.VERY_LONG);
  }

  /**
   * Get cached skill categories
   */
  async getCategories(): Promise<any[] | null> {
    const key = this.key(CachePrefix.CATEGORY, 'all');
    return redis.getJSON(key);
  }

  /**
   * Cache skills by category
   */
  async cacheSkillsByCategory(categoryId: string, skills: any[]): Promise<boolean> {
    const key = this.key(CachePrefix.SKILL, `category:${categoryId}`);
    return redis.setJSON(key, skills, CacheTTL.LONG);
  }

  /**
   * Get cached skills by category
   */
  async getSkillsByCategory(categoryId: string): Promise<any[] | null> {
    const key = this.key(CachePrefix.SKILL, `category:${categoryId}`);
    return redis.getJSON(key);
  }

  /**
   * Cache search results
   */
  async cacheSearch(query: string, filters: any, results: any): Promise<boolean> {
    const searchKey = JSON.stringify({ query, filters });
    const hash = Buffer.from(searchKey).toString('base64').slice(0, 32);
    const key = this.key(CachePrefix.SEARCH, hash);
    return redis.setJSON(key, results, CacheTTL.SHORT);
  }

  /**
   * Get cached search results
   */
  async getSearch(query: string, filters: any): Promise<any | null> {
    const searchKey = JSON.stringify({ query, filters });
    const hash = Buffer.from(searchKey).toString('base64').slice(0, 32);
    const key = this.key(CachePrefix.SEARCH, hash);
    return redis.getJSON(key);
  }

  /**
   * Cache analytics dashboard
   */
  async cacheAnalytics(type: string, data: any): Promise<boolean> {
    const key = this.key(CachePrefix.ANALYTICS, type);
    return redis.setJSON(key, data, CacheTTL.MEDIUM);
  }

  /**
   * Get cached analytics
   */
  async getAnalytics(type: string): Promise<any | null> {
    const key = this.key(CachePrefix.ANALYTICS, type);
    return redis.getJSON(key);
  }

  /**
   * Cache user session
   */
  async cacheSession(sessionId: string, sessionData: any): Promise<boolean> {
    const key = this.key(CachePrefix.SESSION, sessionId);
    return redis.setJSON(key, sessionData, CacheTTL.USER_SESSION);
  }

  /**
   * Get cached session
   */
  async getSession(sessionId: string): Promise<any | null> {
    const key = this.key(CachePrefix.SESSION, sessionId);
    return redis.getJSON(key);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const key = this.key(CachePrefix.SESSION, sessionId);
    return redis.del(key);
  }

  /**
   * Cache notification count
   */
  async cacheNotificationCount(userId: string, count: number): Promise<boolean> {
    const key = this.key(CachePrefix.NOTIFICATION, `count:${userId}`);
    return redis.set(key, count.toString(), CacheTTL.SHORT);
  }

  /**
   * Get cached notification count
   */
  async getNotificationCount(userId: string): Promise<number | null> {
    const key = this.key(CachePrefix.NOTIFICATION, `count:${userId}`);
    const value = await redis.get(key);
    return value ? parseInt(value) : null;
  }

  /**
   * Increment notification count
   */
  async incrementNotificationCount(userId: string): Promise<number> {
    const key = this.key(CachePrefix.NOTIFICATION, `count:${userId}`);
    const count = await redis.incr(key);
    await redis.expire(key, CacheTTL.SHORT);
    return count;
  }

  /**
   * Rate limiting - Check and increment
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = this.key(CachePrefix.RATE_LIMIT, identifier);

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, window);
    }

    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + (ttl * 1000);
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;

    return {
      allowed,
      remaining,
      resetAt,
    };
  }

  /**
   * Generic cache with function execution
   */
  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache
    const cached = await redis.getJSON<T>(key);
    if (cached !== null) {
      logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    // Execute callback and cache result
    logger.debug(`Cache MISS: ${key}`);
    const result = await callback();
    await redis.setJSON(key, result, ttl);
    return result;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const count = await redis.delPattern(pattern);
    logger.info(`Cache invalidated: ${count} keys matching pattern ${pattern}`);
    return count;
  }

  /**
   * Invalidate all user-related caches
   */
  async invalidateUserCaches(userId: string): Promise<void> {
    await Promise.all([
      this.invalidateUser(userId),
      redis.del(this.key(CachePrefix.NOTIFICATION, `count:${userId}`)),
      redis.del(this.key(CachePrefix.SESSION, userId)),
    ]);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmup(data: {
    categories?: any[];
    popularSkills?: Map<string, any[]>;
  }): Promise<void> {
    logger.info('Warming up cache...');

    const promises: Promise<any>[] = [];

    if (data.categories) {
      promises.push(this.cacheCategories(data.categories));
    }

    if (data.popularSkills) {
      for (const [categoryId, skills] of data.popularSkills) {
        promises.push(this.cacheSkillsByCategory(categoryId, skills));
      }
    }

    await Promise.all(promises);
    logger.info('Cache warmup completed');
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    return redis.getStats();
  }

  /**
   * Clear all caches (use with caution!)
   */
  async clearAll(): Promise<boolean> {
    logger.warn('Clearing all caches!');
    return redis.flushAll();
  }
}

export const cacheService = new CacheService();
