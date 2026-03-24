import { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Users, ChevronRight, Calendar, Clock, Trophy, Zap, AlertCircle, Edit2, Trash2, MoreVertical } from 'lucide-react';
import type { CompetitionListItem } from '../types';
import { CompetitionStatusBadge } from './CompetitionStatusBadge';
import { CompetitionTypeBadge } from './CompetitionTypeBadge';
import { useCompetitionsStore } from '../useCompetitionsStore';
import { apiClient } from '../../../services/api';
import toast from 'react-hot-toast';

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
  const { joinCompetition, fetchCompetitions } = useCompetitionsStore();
  const [joining, setJoining] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Get user from Redux
  const user = useSelector((state: any) => state.auth?.user);
  const isAdmin = user?.roles?.includes('admin') || user?.isAdmin;
  
  const isFinished = competition.status === 'closed' || competition.status === 'archived';
  const isScheduled = competition.status === 'scheduled';
  const dateRange = formatDateRange(competition.startTime, competition.endTime);

  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!isScheduled) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const start = new Date(competition.startTime).getTime();
      const distance = start - now;

      if (distance <= 0) {
        setTimeLeft('Starting soon...');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [isScheduled, competition.startTime]);

  const handleClick = () => navigate(`/competitions/${competition._id}`);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/competitions/${competition._id}`);
      toast.success('Competition deleted successfully!');
      setShowDeleteModal(false);
      fetchCompetitions({ limit: 12, page: 1 });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete competition');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/admin/competitions', { state: { editId: competition._id } });
  };

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    medium: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    hard: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    expert: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
        className="group relative bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 group-hover:text-emerald-400 transition-colors">
              {competition.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {competition.description}
            </p>

            {isScheduled && timeLeft && (
              <div className="mb-3 flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/20 w-max font-mono">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Starts in: {timeLeft}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400/90 text-xs sm:text-sm">
                <Calendar className="w-4 h-4 shrink-0" aria-hidden />
                <span>{dateRange}</span>
                {isFinished && <span className="font-medium">(Finished)</span>}
              </div>

              {competition.difficulty && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs sm:text-sm capitalize ${difficultyColors[competition.difficulty as keyof typeof difficultyColors] || difficultyColors.medium}`}>
                  <Zap className="w-4 h-4 shrink-0" aria-hidden />
                  <span>{competition.difficulty}</span>
                </div>
              )}

              {competition.prizes && competition.prizes.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-400 text-xs sm:text-sm">
                  <Trophy className="w-4 h-4 shrink-0" aria-hidden />
                  <span>Prize Pool: {competition.prizes.length > 2 ? `${competition.prizes.length} Prizes` : competition.prizes.join(', ')}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden />
                  {competition.totalSubmissions ?? 0} subs
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden />
                  {competition.participants?.length ?? 0} joined
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 shrink-0">
            <ChevronRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity hidden sm:block" aria-hidden />
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                  title="Admin actions"
                >
                  <MoreVertical size={18} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[150px]">
                    <button
                      onClick={handleEdit}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-2 text-sm transition"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteModal(true);
                        setShowMenu(false);
                      }}
                      disabled={competition.status === 'active' || competition.status === 'closed'}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 flex items-center gap-2 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
            {(!isFinished) && (
              <button 
                className="mt-2 sm:mt-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-sm shadow-md transition-colors disabled:opacity-50"
                disabled={joining}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (competition.status === 'active') {
                    handleClick();
                  } else {
                    try {
                      setJoining(true);
                      await joinCompetition(competition._id);
                      toast.success('Successfully joined the contest!');
                    } catch (err) {
                      toast.error('Failed to join contest.');
                    } finally {
                      setJoining(false);
                    }
                  }
                }}
              >
                {competition.status === 'active' ? 'Enter Now' : (joining ? 'Joining...' : 'Join')}
              </button>
            )}
          </div>
        </div>
      </motion.article>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Confirm Delete</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-semibold">{competition.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const CompetitionCard = memo(CompetitionCardComponent);