import { MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ChatAvailabilityVariant = 'banner' | 'compact';

export interface ChatAvailabilityCalloutProps {
  variant?: ChatAvailabilityVariant;
  className?: string;
}

/**
 * Explains where live chat is available (challenge tab + competition sidebar).
 */
export function ChatAvailabilityCallout({
  variant = 'banner',
  className,
}: ChatAvailabilityCalloutProps) {
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100',
          className,
        )}
        role="note"
        aria-label="Where to find live chat"
      >
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <p>
          <span className="font-semibold text-emerald-900 dark:text-emerald-50">Live chat</span>{' '}
          — open any challenge and use the <strong>Chat</strong> tab; in contests, scroll the right
          column below the leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50/80 p-4 shadow-sm dark:border-emerald-900/35 dark:from-emerald-950/40 dark:via-slate-900/50 dark:to-teal-950/20 sm:flex-row sm:items-center',
        className,
      )}
      role="region"
      aria-labelledby="chat-callout-title"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm dark:bg-emerald-500">
        <MessageCircle className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <h2 id="chat-callout-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Chat with other players
        </h2>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
          <li>
            <strong>Challenges:</strong> open a problem, pick a language, then the <strong>Chat</strong> tab.
          </li>
          <li>
            <strong>Contests:</strong> open a contest — live room is in the <strong>sidebar</strong> under the
            leaderboard.
          </li>
        </ul>
      </div>
    </div>
  );
}
