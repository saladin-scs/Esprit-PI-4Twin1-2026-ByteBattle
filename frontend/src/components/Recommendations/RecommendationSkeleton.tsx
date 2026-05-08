import React from 'react';

const RecommendationSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6 mb-6"></div>
          <div className="flex gap-2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendationSkeleton;
