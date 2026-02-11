/**
 * Loading Fallback Component
 * Used as Suspense fallback for lazy-loaded components
 */

import React from 'react';

interface LoadingFallbackProps {
  fullScreen?: boolean;
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  fullScreen = false,
  message = 'Loading...',
}) => {
  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900'
    : 'flex items-center justify-center min-h-[200px] w-full';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingFallback;
