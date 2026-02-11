/**
 * Performance Hooks
 * React hooks for performance optimization
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce, throttle, PerformanceMarker } from '@/utils/performance';

/**
 * Hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () =>
      debounce((...args: Parameters<T>) => {
        callbackRef.current(...args);
      }, delay),
    [delay]
  );
}

/**
 * Hook for throttled callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () =>
      throttle((...args: Parameters<T>) => {
        callbackRef.current(...args);
      }, limit),
    [limit]
  );
}

/**
 * Hook for Intersection Observer (lazy loading, infinite scroll, etc.)
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit,
  callback?: (entry: IntersectionObserverEntry) => void
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        if (callback) {
          callback(entry);
        }
      },
      options || {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options, callback]);

  return entry;
}

/**
 * Hook for performance measurement
 */
export function usePerformanceMeasure(componentName: string) {
  const markerRef = useRef<PerformanceMarker>(new PerformanceMarker());

  useEffect(() => {
    // Mark component mount
    markerRef.current.mark(`${componentName}-mount-start`);

    return () => {
      // Measure component lifetime
      markerRef.current.mark(`${componentName}-unmount`);
      markerRef.current.measure(
        `${componentName}-lifetime`,
        `${componentName}-mount-start`,
        `${componentName}-unmount`
      );
      markerRef.current.clear();
    };
  }, [componentName]);

  const measureRender = useCallback(() => {
    markerRef.current.mark(`${componentName}-render-${Date.now()}`);
  }, [componentName]);

  return { measureRender };
}

/**
 * Hook for prefetching data on hover
 */
export function usePrefetchOnHover<T>(
  prefetchFn: () => Promise<T>
): {
  onMouseEnter: () => void;
  onTouchStart: () => void;
} {
  const prefetchedRef = useRef(false);

  const handlePrefetch = useCallback(() => {
    if (!prefetchedRef.current) {
      prefetchedRef.current = true;
      prefetchFn().catch((error) => {
        console.error('Prefetch error:', error);
        prefetchedRef.current = false;
      });
    }
  }, [prefetchFn]);

  return {
    onMouseEnter: handlePrefetch,
    onTouchStart: handlePrefetch,
  };
}

/**
 * Hook for idle callback
 */
export function useIdleCallback(callback: () => void, deps: React.DependencyList = []) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(callback, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(callback, 1);
      return () => clearTimeout(id);
    }
  }, deps);
}

/**
 * Hook for network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [networkInfo, setNetworkInfo] = useState<{
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  }>({});

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkInfo({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });

      const handleConnectionChange = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        });
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isSlow: networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g',
    saveData: networkInfo.saveData || false,
    effectiveType: networkInfo.effectiveType,
    downlink: networkInfo.downlink,
    rtt: networkInfo.rtt,
  };
}
