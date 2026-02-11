/**
 * Query Optimization Utilities
 * Helper functions for optimizing database queries
 */

import { Prisma } from '@prisma/client';
import { logger } from './logger';

/**
 * Common select fields for user queries (exclude sensitive data)
 */
export const userSelectSafe = {
  userId: true,
  name: true,
  email: true,
  avatar: true,
  bio: true,
  city: true,
  state: true,
  role: true,
  status: true,
  coins: true,
  level: true,
  rating: true,
  completedSwaps: true,
  totalHoursTaught: true,
  totalHoursLearned: true,
  emailVerified: true,
  createdAt: true,
  lastActive: true,
} as const;

/**
 * Minimal user select for lists
 */
export const userSelectMinimal = {
  userId: true,
  name: true,
  avatar: true,
  rating: true,
  city: true,
  state: true,
} as const;

/**
 * Pagination helper
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResult {
  take: number;
  skip: number;
  page: number;
  limit: number;
}

export function getPagination(params: PaginationParams): PaginationResult {
  const limit = Math.min(params.limit || 20, 100); // Max 100 items per page
  const page = params.page || 1;
  const offset = params.offset !== undefined ? params.offset : (page - 1) * limit;

  return {
    take: limit,
    skip: offset,
    page,
    limit,
  };
}

/**
 * Build pagination response metadata
 */
export function buildPaginationMeta(
  total: number,
  pagination: PaginationResult
): {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasNext: pagination.page < totalPages,
    hasPrev: pagination.page > 1,
  };
}

/**
 * Optimize WHERE clause for text search
 */
export function buildTextSearchFilter(
  query: string,
  fields: string[]
): Prisma.UserWhereInput['OR'] {
  if (!query || query.trim() === '') return undefined;

  const searchTerm = query.trim();

  return fields.map((field) => ({
    [field]: {
      contains: searchTerm,
      mode: 'insensitive' as Prisma.QueryMode,
    },
  }));
}

/**
 * Build date range filter
 */
export function buildDateRangeFilter(
  field: string,
  startDate?: Date,
  endDate?: Date
): any {
  const filter: any = {};

  if (startDate || endDate) {
    filter[field] = {};
    if (startDate) filter[field].gte = startDate;
    if (endDate) filter[field].lte = endDate;
  }

  return filter;
}

/**
 * Optimize sorting
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function buildOrderBy(
  params: SortParams,
  defaultSort: string = 'createdAt'
): any {
  const sortBy = params.sortBy || defaultSort;
  const sortOrder = params.sortOrder || 'desc';

  return { [sortBy]: sortOrder };
}

/**
 * Query performance logger
 */
export async function logSlowQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  threshold: number = 1000
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;

    if (duration > threshold) {
      logger.warn('Slow query detected:', {
        query: queryName,
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
      });
    } else {
      logger.debug(`Query ${queryName} completed in ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Query failed:', {
      query: queryName,
      duration: `${duration}ms`,
      error,
    });
    throw error;
  }
}

/**
 * Batch query helper - prevents N+1 queries
 */
export async function batchQuery<T, K>(
  items: T[],
  keyExtractor: (item: T) => K,
  queryFn: (keys: K[]) => Promise<Map<K, any>>
): Promise<Map<K, any>> {
  if (items.length === 0) {
    return new Map();
  }

  const keys = items.map(keyExtractor);
  const uniqueKeys = Array.from(new Set(keys));

  return await queryFn(uniqueKeys);
}

/**
 * Chunked processing for large datasets
 */
export async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await processor(chunk);
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Optimized count query helper
 */
export async function getApproximateCount(
  exactCountFn: () => Promise<number>,
  cacheKey: string,
  cacheTTL: number = 300
): Promise<{ count: number; isApproximate: boolean }> {
  // Try to get cached count
  // Implementation depends on caching strategy

  const count = await exactCountFn();
  return { count, isApproximate: false };
}

/**
 * Build cursor-based pagination
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export function buildCursorPagination(params: CursorPaginationParams): {
  take: number;
  skip?: number;
  cursor?: { id: string };
} {
  const limit = Math.min(params.limit || 20, 100);
  const result: any = { take: limit };

  if (params.cursor) {
    result.skip = 1; // Skip the cursor
    result.cursor = { id: params.cursor };
  }

  if (params.direction === 'backward') {
    result.take = -limit; // Negative for backward pagination
  }

  return result;
}

/**
 * Optimize nested includes
 */
export function buildOptimizedInclude(
  includeRelations: string[]
): Record<string, boolean | object> {
  const include: Record<string, any> = {};

  for (const relation of includeRelations) {
    if (relation.includes('.')) {
      // Nested include
      const parts = relation.split('.');
      let current = include;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = true;
        } else {
          current[part] = current[part] || { include: {} };
          current = current[part].include;
        }
      }
    } else {
      include[relation] = true;
    }
  }

  return include;
}

/**
 * Build search filter with multiple conditions
 */
export function buildSearchFilter(params: {
  query?: string;
  fields?: string[];
  filters?: Record<string, any>;
  dateRange?: { field: string; start?: Date; end?: Date };
}): any {
  const where: any = {};

  // Text search
  if (params.query && params.fields && params.fields.length > 0) {
    where.OR = buildTextSearchFilter(params.query, params.fields);
  }

  // Additional filters
  if (params.filters) {
    Object.assign(where, params.filters);
  }

  // Date range
  if (params.dateRange) {
    Object.assign(
      where,
      buildDateRangeFilter(
        params.dateRange.field,
        params.dateRange.start,
        params.dateRange.end
      )
    );
  }

  return where;
}

/**
 * Query result caching decorator
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  generateCacheKey: (...args: Parameters<T>) => string,
  ttl: number = 300
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = generateCacheKey(...args);

    // Try to get from cache
    // Implementation depends on caching strategy

    // Execute query
    const result = await fn(...args);

    // Store in cache
    // Implementation depends on caching strategy

    return result;
  }) as T;
}
