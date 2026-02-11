/**
 * Redis Configuration
 * Caching layer for improved performance
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Maximum reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis: Connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis: Reconnecting...');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis: Disconnected');
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<string | null> {
    if (!this.isReady()) {
      logger.warn('Redis not available, skipping cache get');
      return null;
    }

    try {
      return await this.client!.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.isReady()) {
      logger.warn('Redis not available, skipping cache set');
      return false;
    }

    try {
      if (ttl) {
        await this.client!.setEx(key, ttl, value);
      } else {
        await this.client!.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set JSON object in cache
   */
  async setJSON(key: string, value: any, ttl?: number): Promise<boolean> {
    return this.set(key, JSON.stringify(value), ttl);
  }

  /**
   * Get JSON object from cache
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Redis JSON parse error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client!.del(keys);
      return keys.length;
    } catch (error) {
      logger.error(`Redis DEL pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client!.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      return await this.client!.incr(key);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      return await this.client!.decr(key);
    } catch (error) {
      logger.error(`Redis DECR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isReady()) {
      return -1;
    }

    try {
      return await this.client!.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Flush all keys (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client!.flushAll();
      logger.warn('Redis: All keys flushed');
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    dbSize: number;
    memory: string;
    hits: number;
    misses: number;
  }> {
    if (!this.isReady()) {
      return {
        connected: false,
        dbSize: 0,
        memory: '0',
        hits: 0,
        misses: 0,
      };
    }

    try {
      const info = await this.client!.info('stats');
      const dbSize = await this.client!.dbSize();
      const memory = await this.client!.info('memory');

      // Parse stats from info string
      const stats = info.split('\n').reduce((acc: any, line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {});

      return {
        connected: true,
        dbSize,
        memory: memory.split('\n').find(line => line.startsWith('used_memory_human'))?.split(':')[1]?.trim() || '0',
        hits: parseInt(stats.keyspace_hits || '0'),
        misses: parseInt(stats.keyspace_misses || '0'),
      };
    } catch (error) {
      logger.error('Redis STATS error:', error);
      return {
        connected: false,
        dbSize: 0,
        memory: '0',
        hits: 0,
        misses: 0,
      };
    }
  }
}

// Export singleton instance
export const redis = new RedisClient();
