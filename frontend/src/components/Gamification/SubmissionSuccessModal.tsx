/**
 * Real-time feedback after a correct submission: success animation,
 * XP earned, new badges, level progress, leaderboard update.
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Zap, TrendingUp } from 'lucide-react';
import type { RankProgress } from '../../stores/gamificationStore';

const RANK_TIER_COLORS: Record<string, string> = {
  F: 'from-gray-500 to-gray-600',
  E: 'from-gray-400 to-gray-500',
  D: 'from-amber-500 to-amber-600',
  C: 'from-emerald-500 to-emerald-600',
  B: 'from-blue-500 to-blue-600',
  A: 'from-purple-500 to-purple-600',
  S: 'from-yellow-400 to-amber-500',
};

interface SubmissionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  xpEarned: number;
  badgesUnlocked: string[];
  rankProgress: RankProgress | null;
  totalXp: number;
  rankTier: string;
}

export function SubmissionSuccessModal({
  open,
  onClose,
  xpEarned,
  badgesUnlocked,
  rankProgress,
  totalXp,
  rankTier,
}: SubmissionSuccessModalProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-500/30 bg-white p-6 shadow-2xl dark:border-emerald-400/30 dark:bg-gray-800"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 dark:bg-emerald-500/30"
              >
                <span className="text-4xl" aria-hidden>🎉</span>
              </motion.div>
              <h2 id="success-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
                Solution accepted!
              </h2>

              {xpEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-500/15 py-3 px-4 dark:bg-amber-500/20"
                >
                  <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                    +{xpEarned} XP earned
                  </span>
                </motion.div>
              )}

              {badgesUnlocked.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 rounded-xl bg-amber-500/10 py-3 px-4 dark:bg-amber-500/15"
                >
                  <p className="mb-2 flex items-center justify-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-200">
                    <Trophy className="h-4 w-4" /> New badge{badgesUnlocked.length > 1 ? 's' : ''} unlocked
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {badgesUnlocked.map((name, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"
                      >
                        🏅 {name}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {rankProgress && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-4 text-left rounded-xl bg-gray-100 p-4 dark:bg-gray-700/50"
                >
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <TrendingUp className="h-4 w-4" /> Level progress
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-lg bg-gradient-to-r px-2 py-0.5 text-sm font-bold text-white ${RANK_TIER_COLORS[rankTier] ?? 'from-gray-500 to-gray-600'}`}
                    >
                      Tier {rankTier}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {totalXp.toLocaleString()} XP
                    </span>
                  </div>
                  {rankProgress.nextTier && (
                    <div className="mt-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rankProgress.progressFraction * 100}%` }}
                          transition={{ delay: 0.5, duration: 0.6 }}
                          className={`h-full rounded-full bg-gradient-to-r ${RANK_TIER_COLORS[rankTier] ?? 'from-gray-500 to-gray-600'}`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {rankProgress.xpNeededForNext} XP to Tier {rankProgress.nextTier}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-xs text-gray-500 dark:text-gray-400"
              >
                Leaderboard updated · Dashboard stats refreshed
              </motion.p>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SubmissionSuccessModal;
