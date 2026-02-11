/**
 * Optimized Image Component
 * Features: Lazy loading, responsive images, blur placeholder
 */

import React, { useState, useRef, useEffect } from 'react';
import { useIntersectionObserver } from '@/hooks/usePerformance';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  priority?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onLoadingComplete?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  blurDataURL,
  priority = false,
  objectFit = 'cover',
  className = '',
  onLoadingComplete,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(
    priority ? src : blurDataURL
  );
  const imgRef = useRef<HTMLImageElement>(null);

  // Use Intersection Observer for lazy loading (unless priority)
  useIntersectionObserver(
    imgRef,
    {
      root: null,
      rootMargin: '50px',
      threshold: 0.01,
    },
    (entry) => {
      if (entry.isIntersecting && !isInView) {
        setIsInView(true);
      }
    }
  );

  useEffect(() => {
    if (isInView && !isLoaded && src !== currentSrc) {
      // Create a new image to preload
      const img = new Image();
      img.src = src;

      img.onload = () => {
        setCurrentSrc(src);
        setIsLoaded(true);
        if (onLoadingComplete) {
          onLoadingComplete();
        }
      };

      img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        setIsLoaded(true); // Set to true to remove loading state
      };
    }
  }, [isInView, src, currentSrc, isLoaded, onLoadingComplete]);

  // Aspect ratio for maintaining dimensions
  const aspectRatio = width && height ? (height / width) * 100 : undefined;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        paddingBottom: aspectRatio ? `${aspectRatio}%` : undefined,
        width: width || '100%',
        height: !aspectRatio ? height : undefined,
      }}
    >
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        className={`
          absolute inset-0 w-full h-full transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          objectFit,
        }}
        {...props}
      />

      {/* Blur placeholder */}
      {!isLoaded && blurDataURL && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-sm scale-110"
          style={{
            backgroundImage: `url(${blurDataURL})`,
          }}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !blurDataURL && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
    </div>
  );
};

export default OptimizedImage;
