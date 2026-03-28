import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ChevronRight, Calendar, Layers } from 'lucide-react';
import type { CompetitionListItem } from '../types';
import { COMPETITION_TYPE_CONFIG } from '../types';
import { CompetitionStatusBadge } from './CompetitionStatusBadge';
import { CompetitionTypeBadge } from './CompetitionTypeBadge';

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

interface CompetitionCardProps {
  competition: CompetitionListItem;
  index: number;
}

function CompetitionCardComponent({ competition, index }: CompetitionCardProps) {
  const navigate = useNavigate();
  const isFinished = competition.status === 'closed' || competition.status === 'archived';
  const dateRange = formatDateRange(competition.startTime, competition.endTime);

  const handleClick = () => navigate(`/competitions/${competition._id}`);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="bb-card-interactive group"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open ${competition.name}, ${competition.status}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CompetitionTypeBadge type={competition.type} />
            <CompetitionStatusBadge status={competition.status as any} />
            {(competition.challengeIds?.length ?? 0) > 1 && (
              <span className="bb-badge-multi">
                <Layers className="h-3 w-3" aria-hidden />
                {competition.challengeIds.length} problems
              </span>
            )}
          </div>
          <h2 className="mb-1 line-clamp-2 text-xl font-semibold text-slate-900 transition-colors group-hover:text-primary-600 dark:text-slate-100 dark:group-hover:text-primary-400">
            {competition.name}
          </h2>
          <p className="bb-body-text mb-3 line-clamp-2 text-sm">{competition.description}</p>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-500">
            {COMPETITION_TYPE_CONFIG[competition.type]?.shortLabel ?? competition.type} contest ·{' '}
            {isFinished ? 'finished' : 'open'}
          </p>
          <div className="bb-pill-dates">
            <Calendar className="h-4 w-4 shrink-0" aria-hidden />
            <span>{dateRange}</span>
            {isFinished && <span className="font-medium opacity-80">(ended)</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400" aria-hidden />
              Submissions: {competition.totalSubmissions ?? 0}
            </span>
            {competition.participants?.length != null && competition.participants.length > 0 && (
              <span>
                {competition.participants.length} participant{competition.participants.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:text-primary-400">
          <span className="text-sm font-medium">View</span>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </motion.article>
  );
}

export const CompetitionCard = memo(CompetitionCardComponent);
