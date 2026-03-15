import { memo } from 'react';

function CompetitionCardSkeletonComponent() {
  return (
    <div
      className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 animate-pulse"
      role="status"
      aria-label="Loading competition"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded bg-gray-700" />
            <div className="h-5 w-16 rounded bg-gray-700" />
          </div>
          <div className="h-6 w-3/4 rounded bg-gray-700" />
          <div className="h-4 w-full rounded bg-gray-700/80" />
          <div className="h-4 w-2/3 rounded bg-gray-700/80" />
          <div className="h-8 w-64 rounded-lg bg-gray-700" />
          <div className="flex gap-4">
            <div className="h-4 w-32 rounded bg-gray-700/60" />
            <div className="h-4 w-24 rounded bg-gray-700/60" />
          </div>
        </div>
        <div className="h-5 w-12 rounded bg-gray-700 shrink-0" />
      </div>
    </div>
  );
}

export const CompetitionCardSkeleton = memo(CompetitionCardSkeletonComponent);
