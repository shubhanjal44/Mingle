/**
 * API Enhancement Utilities
 * Provides retry logic, timeout handling, and better error messages
 */

import { AxiosError, AxiosRequestConfig } from 'axios';

export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
}

/**
 * Default retry condition - retry on network errors and 5xx server errors
 */
export const defaultRetryCondition = (error: AxiosError): boolean => {
  // Retry on network errors
  if (!error.response) {
    return true;
  }

  // Retry on server errors (5xx)
  if (error.response.status >= 500 && error.response.status < 600) {
    return true;
  }

  // Retry on specific client errors that might be transient
  if (error.response.status === 408 || error.response.status === 429) {
    return true;
  }

  return false;
};

/**
 * Retry a failed request with exponential backoff
 */
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = defaultRetryCondition,
  } = config;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (error instanceof Error && 'isAxiosError' in error) {
        const axiosError = error as AxiosError;
        if (!retryCondition(axiosError)) {
          throw error;
        }
      }

      // Exponential backoff: wait longer for each retry
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.log(`Retrying request (attempt ${attempt + 1}/${maxRetries})...`);
    }
  }

  throw lastError;
};

/**
 * Enhanced error message extraction
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{message?: string; error?: string}>;

    // Network error
    if (!axiosError.response) {
      return 'Network error. Please check your internet connection.';
    }

    // Server provided error message
    if (axiosError.response.data?.message) {
      return axiosError.response.data.message;
    }

    if (axiosError.response.data?.error) {
      return axiosError.response.data.error;
    }

    // HTTP status-based messages
    switch (axiosError.response.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in again.';
      case 403:
        return 'Access denied. You don\'t have permission.';
      case 404:
        return 'Resource not found.';
      case 408:
        return 'Request timeout. Please try again.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. Please try again.';
      default:
        return `Request failed with status ${axiosError.response.status}`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

/**
 * Request timeout wrapper
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
};

/**
 * Batch requests with rate limiting
 */
export class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private maxConcurrent: number;
  private delayBetween: number;

  constructor(maxConcurrent: number = 3, delayBetween: number = 100) {
    this.maxConcurrent = maxConcurrent;
    this.delayBetween = delayBetween;
  }

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxConcurrent);
      await Promise.all(batch.map((fn) => fn()));

      if (this.queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delayBetween));
      }
    }

    this.processing = false;
  }
}

/**
 * Cache wrapper for GET requests
 */
export class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl: number;

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}
