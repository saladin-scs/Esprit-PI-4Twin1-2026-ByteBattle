import React from 'react';

interface Props {
  count?: number;
}

const RecommendationSkeleton: React.FC<Props> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(count)].map((_, i) => (
        <div 
          key={i} 
          className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 animate-pulse"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-4"></div>
          </div>
          
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/2 mb-6"></div>
          
          <div className="flex gap-2 mb-6">
            <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-md w-12"></div>
            <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-md w-12"></div>
          </div>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full w-24"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-10"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendationSkeleton;
