/**
 * Performance Monitoring Middleware
 * Track API performance metrics
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';

interface PerformanceMetrics {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  userId?: string;
  memoryUsage: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly SLOW_THRESHOLD = 1000; // 1 second

  /**
   * Record performance metric
   */
  record(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Log slow requests
    if (metric.responseTime > this.SLOW_THRESHOLD) {
      logger.warn('Slow request detected:', {
        path: metric.path,
        method: metric.method,
        responseTime: `${metric.responseTime}ms`,
        userId: metric.userId,
      });
    }

    // Keep only last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Store in Redis for analytics
    this.storeMetric(metric);
  }

  /**
   * Store metric in Redis
   */
  private async storeMetric(metric: PerformanceMetrics): Promise<void> {
    if (!redis.isReady()) return;

    try {
      const key = `metrics:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      await redis.setJSON(key, metric, 3600); // Store for 1 hour

      // Increment counters
      await redis.incr(`counter:requests:${metric.method}`);
      await redis.incr(`counter:status:${metric.statusCode}`);

      if (metric.responseTime > this.SLOW_THRESHOLD) {
        await redis.incr('counter:slow_requests');
      }
    } catch (error) {
      logger.error('Failed to store performance metric:', error);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRequests: number;
    averageResponseTime: number;
    slowRequests: number;
    fastestRequest: number;
    slowestRequest: number;
    requestsByMethod: Record<string, number>;
    requestsByStatus: Record<number, number>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        fastestRequest: 0,
        slowestRequest: 0,
        requestsByMethod: {},
        requestsByStatus: {},
      };
    }

    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0);
    const slowRequests = this.metrics.filter(m => m.responseTime > this.SLOW_THRESHOLD).length;

    const requestsByMethod = this.metrics.reduce((acc, m) => {
      acc[m.method] = (acc[m.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByStatus = this.metrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const responseTimes = this.metrics.map(m => m.responseTime).sort((a, b) => a - b);

    return {
      totalRequests: this.metrics.length,
      averageResponseTime: Math.round(totalResponseTime / this.metrics.length),
      slowRequests,
      fastestRequest: responseTimes[0] || 0,
      slowestRequest: responseTimes[responseTimes.length - 1] || 0,
      requestsByMethod,
      requestsByStatus,
    };
  }

  /**
   * Get percentile response time
   */
  getPercentile(percentile: number): number {
    if (this.metrics.length === 0) return 0;

    const sorted = this.metrics
      .map(m => m.responseTime)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Get metrics for a specific path
   */
  getPathMetrics(path: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.path === path);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    logger.info('Performance metrics cleared');
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Performance monitoring middleware
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  // Capture the original end function
  const originalEnd = res.end;

  // Override end function
  res.end = function (...args: any[]): any {
    const responseTime = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsage = endMemory - startMemory;

    // Record metrics
    performanceMonitor.record({
      path: req.path || req.url,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      timestamp: Date.now(),
      userId: (req as any).user?.userId,
      memoryUsage,
    });

    // Add performance headers
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Memory-Usage', `${Math.round(memoryUsage / 1024)}KB`);

    // Call original end
    return originalEnd.apply(res, args as any);
  };

  next();
}

/**
 * Get performance statistics
 */
export function getPerformanceStats() {
  return performanceMonitor.getStats();
}

/**
 * Get percentile
 */
export function getPerformancePercentile(percentile: number) {
  return performanceMonitor.getPercentile(percentile);
}

/**
 * Get path-specific metrics
 */
export function getPathPerformance(path: string) {
  return performanceMonitor.getPathMetrics(path);
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics() {
  return performanceMonitor.clear();
}

export { performanceMonitor };
