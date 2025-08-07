import React from 'react';
import { Loader2, Zap } from 'lucide-react';

interface StandardLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export default function StandardLoading({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false 
}: StandardLoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center">
      <div className="relative mb-4">
        <div className={`${sizeClasses[size]} border-2 border-gray-300 border-t-black rounded-full animate-spin`} />
      </div>
      {text && (
        <p className={`text-gray-600 ${textSizeClasses[size]} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <LoadingContent />
        </div>
      </div>
    );
  }

  return <LoadingContent />;
}

// Skeleton components for consistent loading states
export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 rounded-lg h-32 w-full mb-4"></div>
      <div className="space-y-2">
        <div className="bg-gray-200 rounded h-4 w-3/4"></div>
        <div className="bg-gray-200 rounded h-4 w-1/2"></div>
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded h-4 ${
            i === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  );
}

export function SkeletonButton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 rounded-lg h-10 w-24"></div>
    </div>
  );
}
