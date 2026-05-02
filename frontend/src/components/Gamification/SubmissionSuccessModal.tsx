/**
 * Real-time feedback after a correct submission: success animation,
 * XP earned, new badges, level progress, leaderboard update.
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Zap, TrendingUp, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
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
      {open && createPortal(
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
          {/* Confetti particles */}
          <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
            <Confetti />
          </div>

          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="success-modal-title"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-white p-6 shadow-2xl dark:border-emerald-400/30 dark:bg-gray-900"
            >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              >
                <Trophy className="h-10 w-10" aria-hidden />
              </motion.div>
              <h2 id="success-modal-title" className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Solution accepted!
              </h2>

              {xpEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/10 py-3 px-4 dark:bg-amber-500/20"
                >
                  <Zap className="h-6 w-6 text-amber-600 dark:text-amber-400 animate-pulse" />
                  <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                    +{xpEarned} XP earned
                  </span>
                </motion.div>
              )}

              {badgesUnlocked.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 py-3 px-4 dark:border-amber-900/30 dark:bg-amber-950/20"
                >
                  <p className="mb-2 flex items-center justify-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-200">
                    <Trophy className="h-4 w-4" /> New badge{badgesUnlocked.length > 1 ? 's' : ''} unlocked
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {badgesUnlocked.map((name, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-400/20 dark:text-amber-100"
                      >
                        🏅 {name}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {rankProgress && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-4 text-left rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800/50 dark:bg-slate-800/40"
                >
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <TrendingUp className="h-3 w-3" /> Level progress
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-lg bg-gradient-to-r px-2 py-0.5 text-sm font-black text-white shadow-sm ${RANK_TIER_COLORS[rankTier] ?? 'from-gray-500 to-gray-600'}`}
                    >
                      Tier {rankTier}
                    </span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      {totalXp.toLocaleString()} <span className="text-gray-400 dark:text-gray-500 font-medium">XP</span>
                    </span>
                  </div>
                  {rankProgress.nextTier && (
                    <div className="mt-3">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rankProgress.progressFraction * 100}%` }}
                          transition={{ delay: 0.6, duration: 1, ease: 'circOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${RANK_TIER_COLORS[rankTier] ?? 'from-gray-500 to-gray-600'}`}
                        />
                      </div>
                      <p className="mt-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        <span className="font-bold text-gray-900 dark:text-white">{rankProgress.xpNeededForNext} XP</span> until Tier <span className="font-bold text-gray-900 dark:text-white">{rankProgress.nextTier}</span>
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-6 text-[10px] uppercase font-bold tracking-widest text-emerald-600/60 dark:text-emerald-400/40"
              >
                Leaderboard updated · Dashboard stats refreshed
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="group relative mt-6 w-full overflow-hidden rounded-2xl bg-gray-900 py-3.5 font-bold text-white shadow-xl transition-all hover:bg-gray-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Continue solve <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </motion.button>
            </div>
            </motion.div>
          </div>
        </>,
        document.body,
      )}
    </AnimatePresence>
  );
}

function Confetti() {
  const particles = Array.from({ length: 40 });
  return (
    <>
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: '50vw',
            y: '50vh',
            scale: 0,
            rotate: 0,
            opacity: 1
          }}
          animate={{
            x: `${Math.random() * 120 - 10}vw`,
            y: `${Math.random() * 120 - 10}vh`,
            scale: [0, 1, 0.5, 0],
            rotate: Math.random() * 720,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            ease: 'easeOut',
            delay: Math.random() * 0.2
          }}
          className="fixed h-2 w-2 rounded-sm"
          style={{
            backgroundColor: [
              '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
            ][Math.floor(Math.random() * 6)]
          }}
        />
      ))}
    </>
  );
}

export default SubmissionSuccessModal;
