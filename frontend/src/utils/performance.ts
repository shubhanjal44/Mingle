/**
 * Frontend Performance Utilities
 * Helpers for optimizing frontend performance
 */

/**
 * Debounce function to limit how often a function can fire
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure a function is called at most once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Lazy load images with Intersection Observer
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;

  constructor(options?: IntersectionObserverInit) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            const srcset = img.dataset.srcset;

            if (src) {
              img.src = src;
            }
            if (srcset) {
              img.srcset = srcset;
            }

            img.classList.add('loaded');
            if (this.observer) {
              this.observer.unobserve(img);
            }
          }
        });
      }, options || {
        root: null,
        rootMargin: '50px',
        threshold: 0.01,
      });
    }
  }

  observe(element: HTMLElement) {
    if (this.observer) {
      this.observer.observe(element);
    }
  }

  unobserve(element: HTMLElement) {
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

/**
 * Prefetch a route
 */
export function prefetchRoute(route: string): void {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = route;
  document.head.appendChild(link);
}

/**
 * Preload critical resources
 */
export function preloadResource(url: string, as: string): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Request idle callback wrapper
 */
export function requestIdleCallback(callback: () => void, timeout = 2000): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Get network information
 */
export function getNetworkInfo(): {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
} {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
  return {};
}

/**
 * Check if connection is slow
 */
export function isSlowConnection(): boolean {
  const networkInfo = getNetworkInfo();
  return (
    networkInfo.effectiveType === 'slow-2g' ||
    networkInfo.effectiveType === '2g' ||
    networkInfo.saveData === true
  );
}

/**
 * Performance mark and measure
 */
export class PerformanceMarker {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
    if (typeof performance.mark === 'function') {
      performance.mark(name);
    }
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : performance.now();

    if (!startTime || !endTime) {
      console.warn(`Performance marks not found: ${startMark}, ${endMark}`);
      return 0;
    }

    const duration = endTime - startTime;

    if (typeof performance.measure === 'function') {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        // Ignore errors from performance.measure
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  clear(name?: string): void {
    if (name) {
      this.marks.delete(name);
      if (typeof performance.clearMarks === 'function') {
        performance.clearMarks(name);
      }
      if (typeof performance.clearMeasures === 'function') {
        performance.clearMeasures(name);
      }
    } else {
      this.marks.clear();
      if (typeof performance.clearMarks === 'function') {
        performance.clearMarks();
      }
      if (typeof performance.clearMeasures === 'function') {
        performance.clearMeasures();
      }
    }
  }
}

/**
 * Web Vitals monitoring (requires web-vitals package or custom implementation)
 */
export interface VitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export function reportWebVitals(onPerfEntry?: (metric: VitalsMetric) => void): void {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    // This would typically use the web-vitals library
    // For now, we'll use basic Performance API measurements

    // First Contentful Paint (FCP)
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      onPerfEntry({
        name: 'FCP',
        value: fcp.startTime,
        rating: fcp.startTime < 1800 ? 'good' : fcp.startTime < 3000 ? 'needs-improvement' : 'poor',
        delta: fcp.startTime,
        id: 'fcp-' + Date.now(),
      });
    }

    // Largest Contentful Paint (LCP)
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        onPerfEntry({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor',
          delta: lastEntry.startTime,
          id: 'lcp-' + Date.now(),
        });
      }
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Browser doesn't support LCP
    }
  }
}

/**
 * Cache API wrapper for runtime caching
 */
export class RuntimeCache {
  private cacheName: string;

  constructor(cacheName: string = 'app-runtime-cache') {
    this.cacheName = cacheName;
  }

  async get(key: string): Promise<any | null> {
    if (!('caches' in window)) return null;

    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(key);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  async set(key: string, data: any, ttl?: number): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cache = await caches.open(this.cacheName);
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': ttl ? `max-age=${ttl}` : 'no-cache',
        },
      });
      await cache.put(key, response);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!('caches' in window)) return false;

    try {
      const cache = await caches.open(this.cacheName);
      return await cache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      await caches.delete(this.cacheName);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

export default {
  debounce,
  throttle,
  LazyImageLoader,
  prefetchRoute,
  preloadResource,
  prefersReducedMotion,
  measurePerformance,
  requestIdleCallback,
  getNetworkInfo,
  isSlowConnection,
  PerformanceMarker,
  reportWebVitals,
  RuntimeCache,
};
