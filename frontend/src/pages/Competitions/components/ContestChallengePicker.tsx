import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers, ExternalLink, CheckCircle2, Copy, Check, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../../lib/utils';
import type { ChallengeInfo } from '../useCompetitionDetail';
import { DifficultyBadge } from '../../../components/Challenges';
import { SimpleTooltip } from '../../../shared/components';

interface ContestChallengePickerProps {
  challenges: ChallengeInfo[];
  activeId: string | null;
  onSelect: (id: string) => void;
  competitionType: string;
  className?: string;
}

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const short = id.length > 10 ? `…${id.slice(-8)}` : id;
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success('Challenge ID copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <SimpleTooltip content={<span className="font-mono text-[10px] break-all">{id}</span>} side="bottom">
      <button
        type="button"
        onClick={copy}
        className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1.5 text-left transition-colors hover:border-primary-500/40 hover:bg-primary-500/5 dark:border-slate-600 dark:bg-slate-800/80 dark:hover:border-primary-500/30"
        aria-label={`Copy challenge ID ${id}`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Hash className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
          <code className="truncate text-[10px] text-slate-600 dark:text-slate-400">{short}</code>
        </span>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-primary-500" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        )}
      </button>
    </SimpleTooltip>
  );
}

function ContestChallengePickerComponent({
  challenges,
  activeId,
  onSelect,
  competitionType,
  className,
}: ContestChallengePickerProps) {
  if (challenges.length === 0) return null;

  const multi = challenges.length > 1 || competitionType === 'algorithmic';

  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-md dark:border-slate-700/80 dark:from-slate-900/90 dark:to-slate-900/50',
        className,
      )}
      aria-label="Contest problems"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-primary-400">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-primary-600 dark:text-primary-400">
            <Layers className="h-4 w-4" aria-hidden />
          </div>
          <span>
            {multi ? (
              <>
                Problems <span className="font-normal text-slate-500 dark:text-slate-400">({challenges.length})</span>
              </>
            ) : (
              'Problem'
            )}
          </span>
        </div>
        <SimpleTooltip content="Each card shows the challenge title, difficulty, and ID for support or API use.">
          <span className="cursor-help text-xs text-slate-400 underline decoration-dotted dark:text-slate-500">
            About IDs
          </span>
        </SimpleTooltip>
      </div>
      <div
        className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap', multi && 'sm:gap-4')}
        role={multi ? 'tablist' : undefined}
      >
        {challenges.map((ch, idx) => {
          const isActive = ch._id === activeId;
          return (
            <motion.div
              key={ch._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className={cn(
                'relative flex min-w-0 flex-1 rounded-2xl border-2 transition-all duration-200 sm:min-w-[220px] sm:max-w-[340px]',
                isActive
                  ? 'border-primary-500 bg-primary-500/[0.08] shadow-lg shadow-primary-500/10 ring-2 ring-primary-500/25 dark:bg-primary-500/12'
                  : 'border-slate-200/90 bg-white/80 hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-slate-500',
              )}
            >
              <button
                type="button"
                role={multi ? 'tab' : undefined}
                aria-selected={multi ? isActive : undefined}
                onClick={() => onSelect(ch._id)}
                className="flex min-w-0 flex-1 flex-col items-stretch gap-1 rounded-2xl p-4 pb-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-bold leading-snug text-slate-900 dark:text-slate-50">
                    <span className="mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-black text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {idx + 1}
                    </span>
                    {ch.title}
                  </span>
                  {isActive && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />}
                </span>
                <div className="mt-1">
                  <DifficultyBadge difficulty={ch.difficulty} />
                </div>
                <CopyIdButton id={ch._id} />
              </button>
              <Link
                to={`/challenges/${ch._id}`}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all hover:border-primary-500/50 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:hover:text-primary-400"
                title="Open full challenge"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </motion.div>
          );
        })}
      </div>
      {multi && (
        <p className="mt-4 rounded-lg bg-slate-100/80 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
          Select a problem for its statement and submission. Algorithmic contests score each problem separately. Use{' '}
          <strong>Copy ID</strong> if you need the exact challenge reference.
        </p>
      )}
    </section>
  );
}

export const ContestChallengePicker = memo(ContestChallengePickerComponent);
