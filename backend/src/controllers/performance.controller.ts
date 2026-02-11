/**
 * Performance Monitoring Controller
 * Expose performance metrics via API
 */

import { Request, Response, NextFunction } from 'express';
import {
  getPerformanceStats,
  getPerformancePercentile,
  clearPerformanceMetrics
} from '../middleware/performance';
import { cacheService } from '../services/cache.service';
import { redis } from '../config/redis';

class PerformanceController {
  /**
   * Get overall performance statistics
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = getPerformanceStats();

      res.json({
        success: true,
        data: {
          ...stats,
          percentiles: {
            p50: getPerformancePercentile(50),
            p75: getPerformancePercentile(75),
            p90: getPerformancePercentile(90),
            p95: getPerformancePercentile(95),
            p99: getPerformancePercentile(99),
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await cacheService.getStats();

      res.json({
        success: true,
        data: {
          ...stats,
          hitRate: stats.hits > 0
            ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
            : '0%',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system health status
   */
  async getHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: Math.floor(uptime),
          formatted: formatUptime(uptime),
        },
        memory: {
          rss: formatBytes(memoryUsage.rss),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          external: formatBytes(memoryUsage.external),
          heapUsagePercentage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%',
        },
        redis: {
          connected: redis.isReady(),
        },
        nodeVersion: process.version,
        platform: process.platform,
        cpu: process.cpuUsage(),
      };

      // Determine overall health status
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (heapUsagePercent > 90) {
        health.status = 'critical';
      } else if (heapUsagePercent > 75 || !redis.isReady()) {
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status !== 'critical',
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed metrics
   */
  async getDetailedMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const performance = getPerformanceStats();
      const cache = await cacheService.getStats();
      const memory = process.memoryUsage();

      res.json({
        success: true,
        data: {
          performance: {
            ...performance,
            percentiles: {
              p50: getPerformancePercentile(50),
              p75: getPerformancePercentile(75),
              p90: getPerformancePercentile(90),
              p95: getPerformancePercentile(95),
              p99: getPerformancePercentile(99),
            },
          },
          cache: {
            ...cache,
            hitRate: cache.hits > 0
              ? ((cache.hits / (cache.hits + cache.misses)) * 100).toFixed(2) + '%'
              : '0%',
          },
          system: {
            memory: {
              rss: formatBytes(memory.rss),
              heapTotal: formatBytes(memory.heapTotal),
              heapUsed: formatBytes(memory.heapUsed),
              external: formatBytes(memory.external),
              arrayBuffers: formatBytes(memory.arrayBuffers),
            },
            uptime: formatUptime(process.uptime()),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear performance metrics
   */
  async clearMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      clearPerformanceMetrics();

      res.json({
        success: true,
        message: 'Performance metrics cleared',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear cache
   */
  async clearCache(req: Request, res: Response, next: NextFunction) {
    try {
      const pattern = req.query.pattern as string;

      if (pattern) {
        const count = await cacheService.invalidatePattern(pattern);
        res.json({
          success: true,
          message: `Cleared ${count} cache entries matching pattern: ${pattern}`,
          count,
        });
      } else {
        await cacheService.clearAll();
        res.json({
          success: true,
          message: 'All cache cleared',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Warm up cache
   */
  async warmupCache(req: Request, res: Response, next: NextFunction) {
    try {
      // This would typically be called during deployment
      // For now, just acknowledge the request

      res.json({
        success: true,
        message: 'Cache warmup initiated',
      });
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format uptime to human readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export const performanceController = new PerformanceController();
