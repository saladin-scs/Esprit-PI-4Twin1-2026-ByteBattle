import { memo } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '../../../shared/components';
import type { LeaderboardEntry } from '../types';
import type { CompetitionType } from '../types';

function formatDate(s: string): string {
  return new Date(s).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  type: CompetitionType;
  index: number;
}

function LeaderboardRowComponent({ entry, type, index }: LeaderboardRowProps) {
  const isFirst = entry.rank === 1;
  const isSecond = entry.rank === 2;
  const isThird = entry.rank === 3;
  const scoreText =
    type === 'code_golf'
      ? `${entry.score} bytes with ${entry.language}`
      : type === 'speed'
        ? `${entry.executionTimeMs} ms with ${entry.language}`
        : `${entry.score} pts · ${entry.language}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-gray-700/50 text-sm border-b border-gray-700/50 last:border-0 transition-colors"
    >
      <span className="w-8 shrink-0 flex items-center justify-center" aria-hidden>
        {isFirst && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-gray-900 font-bold text-xs">
            1
          </span>
        )}
        {isSecond && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 text-gray-800 font-bold text-xs">
            2
          </span>
        )}
        {isThird && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs">
            3
          </span>
        )}
        {!isFirst && !isSecond && !isThird && (
          <span className="text-gray-500 font-medium">#{entry.rank}</span>
        )}
      </span>
      <Avatar
        fallback={entry.username ?? entry.userId}
        size="sm"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-200 truncate" title={entry.username ?? entry.userId}>
          {entry.username ?? entry.userId?.slice(-8) ?? '—'}
        </div>
        <div className="text-xs text-gray-500">{scoreText}</div>
        <div className="text-xs text-gray-600">Submitted: {formatDate(entry.submittedAt)}</div>
      </div>
    </motion.div>
  );
}

export const LeaderboardRow = memo(LeaderboardRowComponent);
