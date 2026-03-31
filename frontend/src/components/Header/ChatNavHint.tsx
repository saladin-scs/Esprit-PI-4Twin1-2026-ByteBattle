import { MessageCircle } from 'lucide-react';

export function ChatNavHint() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
      Chat available
    </div>
  );
}
