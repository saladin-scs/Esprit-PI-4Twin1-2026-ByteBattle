type ScoreBreakdown = {
  passScore?: number;
  submissionSpeedScore?: number;
  executionEfficiencyScore?: number;
  bonusScore?: number;
  totalScore?: number;
};

type BattleScoreCardProps = {
  username: string;
  isYou?: boolean;
  submitted?: boolean;
  passed?: boolean;
  submissionTime?: string | null;
  scoreBreakdown?: ScoreBreakdown;
};

export function BattleScoreCard({
  username,
  isYou = false,
  submitted = false,
  passed = false,
  submissionTime,
  scoreBreakdown,
}: BattleScoreCardProps) {
  const total = scoreBreakdown?.totalScore ?? 0;
  return (
    <article className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {username}
          {isYou ? ' (you)' : ''}
        </h3>
        <span className="text-indigo-600 dark:text-indigo-300 font-bold">{total.toFixed(3)} pts</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {submitted ? (passed ? 'Passed all tests' : 'Submitted') : 'No submission'}
        {submissionTime ? ` · ${new Date(submissionTime).toLocaleTimeString()}` : ''}
      </p>
    </article>
  );
}

