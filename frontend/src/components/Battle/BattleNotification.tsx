type BattleNotificationProps = {
  tone?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
};

export function BattleNotification({ tone = 'info', title, message }: BattleNotificationProps) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
        : tone === 'error'
          ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300'
          : 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300';

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`} role="status" aria-live="polite">
      <p className="font-semibold text-sm">{title}</p>
      {message ? <p className="text-xs mt-0.5">{message}</p> : null}
    </div>
  );
}

