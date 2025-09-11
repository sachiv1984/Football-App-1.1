import React from 'react';

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => (
  <div className="text-center py-12">
    <div className="inline-flex items-center space-x-2">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      <span className="text-gray-600 dark:text-gray-300">{message}</span>
    </div>
  </div>
);

interface ErrorProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorProps> = ({ message, onRetry }) => (
  <div className="text-center py-8">
    <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 max-w-md mx-auto">
      <div className="text-red-600 dark:text-red-300 font-medium mb-2">⚠️ Error</div>
      <p className="text-red-700 dark:text-red-200 text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white dark:text-gray-200 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);
