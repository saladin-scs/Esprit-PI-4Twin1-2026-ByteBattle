import { MessageCircle } from 'lucide-react';

type Props = {
  className?: string;
  variant?: 'default' | 'compact';
};

export function ChatAvailabilityCallout({ className = '', variant = 'default' }: Props) {
  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 ${variant === 'compact' ? 'px-3 py-2' : 'px-4 py-3'} ${className}`}
    >
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4" aria-hidden />
        <span>Challenge chat is available while you are signed in.</span>
      </div>
    </div>
  );
}
