/**
 * Network Status Indicator Component
 * Shows a banner when user is offline or connection is restored
 */

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const NetworkStatus = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // Show offline banner immediately
      setShowBanner(true);
    } else if (wasOffline) {
      // Show "back online" banner briefly
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showBanner ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {!isOnline ? (
        // Offline Banner
        <div className="bg-red-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <WifiOff className="w-5 h-5 animate-pulse" />
            <p className="font-medium">
              No internet connection. Some features may be unavailable.
            </p>
          </div>
        </div>
      ) : (
        // Back Online Banner
        <div className="bg-green-600 text-white px-4 py-3 shadow-lg animate-slide-down">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <Wifi className="w-5 h-5" />
            <p className="font-medium">
              Connection restored! You're back online.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;
