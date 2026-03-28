import { memo } from 'react';

function CompetitionCardSkeletonComponent() {
  return (
    <div className="bb-skeleton-card" role="status" aria-label="Loading competition">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-16 rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-6 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-full rounded-lg bg-slate-200/90 dark:bg-slate-700/80" />
          <div className="h-4 w-2/3 rounded-lg bg-slate-200/90 dark:bg-slate-700/80" />
          <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="flex gap-4">
            <div className="h-4 w-32 rounded bg-slate-200/80 dark:bg-slate-700/60" />
            <div className="h-4 w-24 rounded bg-slate-200/80 dark:bg-slate-700/60" />
          </div>
        </div>
        <div className="h-5 w-12 shrink-0 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export const CompetitionCardSkeleton = memo(CompetitionCardSkeletonComponent);
