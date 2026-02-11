/**
 * Online/Offline Detection Hook
 * Monitors network connectivity status
 */

import { useState, useEffect } from 'react';

export interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean; // Track if the user was offline before
}

/**
 * Hook to detect online/offline status
 */
export const useOnlineStatus = (): OnlineStatus => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // User came back online, remember they were offline
      if (!isOnline) {
        setWasOffline(true);
        // Reset wasOffline after 5 seconds
        setTimeout(() => setWasOffline(false), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check (some browsers don't reliably fire online/offline events)
    const interval = setInterval(() => {
      if (navigator.onLine !== isOnline) {
        setIsOnline(navigator.onLine);
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
};

/**
 * Hook to check if a specific URL is reachable
 */
export const useNetworkCheck = (checkUrl?: string) => {
  const [isReachable, setIsReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkNetwork = async () => {
    if (!checkUrl) return;

    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(checkUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      setIsReachable(response.ok);
    } catch (error) {
      setIsReachable(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (checkUrl) {
      checkNetwork();
      const interval = setInterval(checkNetwork, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [checkUrl]);

  return { isReachable, isChecking, checkNetwork };
};

export default useOnlineStatus;
