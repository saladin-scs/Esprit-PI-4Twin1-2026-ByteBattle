import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ChevronRight, Calendar } from 'lucide-react';
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
      className="group bg-gray-800/50 dark:bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open ${competition.name}, ${competition.status}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <CompetitionTypeBadge type={competition.type} />
            <CompetitionStatusBadge status={competition.status as any} />
          </div>
          <h2 className="text-xl font-semibold text-gray-100 mb-1 line-clamp-2 group-hover:text-emerald-400 transition-colors">
            {competition.name}
          </h2>
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {competition.description}
          </p>
          <p className="text-xs text-gray-500 mb-2">
            {COMPETITION_TYPE_CONFIG[competition.type]?.shortLabel ?? competition.type} contest. Click to view {isFinished ? 'solutions' : 'contest'}.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400/90 text-sm">
            <Calendar className="w-4 h-4 shrink-0" aria-hidden />
            <span>Active dates: {dateRange}</span>
            {isFinished && <span className="font-medium">(Finished)</span>}
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-500" aria-hidden />
              Total solutions: {competition.totalSubmissions ?? 0}
            </span>
            {competition.participants?.length != null && competition.participants.length > 0 && (
              <span>{competition.participants.length} participant{competition.participants.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-emerald-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <span className="text-sm font-medium">View</span>
          <ChevronRight className="w-5 h-5" aria-hidden />
        </div>
      </div>
    </motion.article>
  );
}

export const CompetitionCard = memo(CompetitionCardComponent);