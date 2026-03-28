import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

/**
 * Compact header hint — links to challenges where users discover the Chat tab.
 */
export function ChatNavHint() {
  return (
    <Link
      to="/challenges"
      className="inline-flex max-w-[140px] items-center gap-1.5 truncate rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/40 sm:max-w-none"
      title="Open a challenge, then use the Chat tab. In contests, use the sidebar chat."
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      <span className="hidden sm:inline">Live chat</span>
      <span className="sm:hidden">Chat</span>
    </Link>
  );
}
