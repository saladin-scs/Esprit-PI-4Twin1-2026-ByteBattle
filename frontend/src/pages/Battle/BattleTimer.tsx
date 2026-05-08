type BattleTimerProps = {
  remainingSeconds: number;
  totalDurationSeconds: number;
  opponentSubmitted: boolean;
  paused?: boolean;
  /** Defaults: “Opponent pending” / “Opponent submitted” */
  pendingLabel?: string;
  submittedLabel?: string;
};

function toClock(secondsTotal: number) {
  const safe = Math.max(0, Math.floor(secondsTotal));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function BattleTimer({
  remainingSeconds,
  totalDurationSeconds,
  opponentSubmitted,
  paused = false,
  pendingLabel = 'Opponent pending',
  submittedLabel = 'Opponent submitted',
}: BattleTimerProps) {
  const pctLeft = totalDurationSeconds > 0 ? (remainingSeconds / totalDurationSeconds) * 100 : 0;
  const colorClass =
    pctLeft > 50
      ? 'bg-emerald-500'
      : pctLeft >= 25
        ? 'bg-amber-500'
        : 'bg-red-500';
  const dangerBlink = remainingSeconds > 0 && remainingSeconds <= 10;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-3 shadow-sm">
      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ease-linear ${colorClass}`}
          style={{ width: `${Math.max(0, Math.min(100, pctLeft))}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span
          className={`font-mono text-xl font-bold tracking-wide ${
            dangerBlink ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-900 dark:text-white'
          }`}
        >
          {toClock(remainingSeconds)}
        </span>
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
          {opponentSubmitted ? submittedLabel : pendingLabel}
        </span>
      </div>
      {paused && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Timer paused (spectator/admin)</p>}
    </div>
  );
}
