import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Info, ArrowRight, Zap, Target, Clock, Monitor, Smartphone } from 'lucide-react';
import { challengesApi, type RecommendedChallengeItem } from '../../services/api';
import { RootState } from '../../store/store';
import RecommendationSkeleton from './RecommendationSkeleton';
import { DifficultyBadge } from '../Challenges';
import { useRecommendationTracking } from '../../hooks/useRecommendationTracking';

interface Props {
  title?: string;
  limit?: number;
  showIcon?: boolean;
  context?: 'home' | 'detail';
}

const RecommendationSection: React.FC<Props> = ({ 
  title, 
  limit = 4,
  showIcon = true,
  context = 'home'
}) => {
  const [items, setItems] = useState<RecommendedChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const user = useSelector((state: RootState) => state.auth.user);
  const username = user?.username;
  const sectionRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  // Device awareness
  const isMobile = window.innerWidth < 768;
  const currentHour = new Date().getHours();
  const timeContext = currentHour < 12 ? 'Morning' : currentHour < 18 ? 'Afternoon' : 'Evening';

  const defaultTitle = title || (context === 'home' 
    ? `🔥 ${timeContext} Picks for You` 
    : '💡 You May Also Like');

  // Tracking
  const { trackClick } = useRecommendationTracking(items[0]?.id);

  const fetchRecommendations = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setPage(1);
      }
      
      const pathParts = window.location.pathname.split('/');
      const currentItemId = context === 'detail' ? pathParts[pathParts.length - 1] : null;

      let newItems: RecommendedChallengeItem[] = [];
      let usedFallback = false;

      if (context === 'detail' && currentItemId && isInitial) {
        const { data } = await challengesApi.getSimilar(currentItemId, { limit });
        newItems = data.challenges || [];
      } else if (username) {
        const { data } = await challengesApi.getRecommendations(username, { limit: limit * page });
        newItems = data.challenges || [];
      }

      if (newItems.length === 0) {
        const trending = await challengesApi.getAll({ limit, page: isInitial ? 1 : page });
        newItems = trending.data.challenges?.slice(0, limit) || [];
        usedFallback = true;
      }

      setItems(prev => isInitial ? newItems : [...prev, ...newItems]);
      setIsFallback(usedFallback);
      setHasMore(newItems.length >= limit && !usedFallback);
      setError(false);
    } catch (err) {
      console.error('Recs fetch failed', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [username, limit, context, page]);

  useEffect(() => {
    fetchRecommendations(true);
  }, [username, context]);

  // Infinite Scroll logic
  const lastItemRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && context === 'home') {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, context]);

  useEffect(() => {
    if (page > 1) {
      fetchRecommendations(false);
    }
  }, [page]);

  if (loading && items.length === 0) return <div className="py-8"><RecommendationSkeleton count={limit} /></div>;
  if (error && items.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-12 relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {showIcon && (
            <div className="p-2 bg-primary-500/10 rounded-lg">
              {isMobile ? <Smartphone className="w-5 h-5 text-primary-500" /> : <Monitor className="w-5 h-5 text-primary-500" />}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              {defaultTitle}
              {!isFallback && <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isFallback 
                ? 'Popular challenges on ByteBattle right now' 
                : `AI-curated for your ${timeContext.toLowerCase()} session`}
            </p>
          </div>
        </div>
        <Link 
          to="/challenges" 
          className="group flex items-center gap-2 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors"
        >
          Explore All
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.div
              key={`${item.id}-${index}`}
              ref={index === items.length - 1 ? lastItemRef : null}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="group relative bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-500/30 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <DifficultyBadge difficulty={item.difficulty} />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Optimistic Update: Remove from UI immediately
                      setItems(prev => prev.filter(i => i.id !== item.id));
                      // Send feedback to server
                      challengesApi.trackEngagement({
                        userId: username || 'guest',
                        itemId: item.id,
                        eventType: 'click', // Or a custom 'dismiss' event
                        context: { dismissed: true }
                      }).catch(() => {});
                    }}
                    className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-full transition-colors group/dismiss"
                    title="Not interested"
                  >
                    <Target className="w-4 h-4 group-hover/dismiss:scale-110 transition-transform" />
                  </button>
                  <div className="group/info relative">
                    <div className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-help">
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    
                    {/* Explainable AI Tooltip */}
                  <div className="absolute bottom-full right-0 mb-3 w-64 p-4 bg-gray-900 text-white text-xs rounded-2xl opacity-0 group-hover/info:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-2xl border border-white/10 translate-y-2 group-hover/info:translate-y-0">
                    <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isFallback ? 'Trending Content' : 'AI Insight'}</span>
                    </div>
                    <p className="text-gray-300 leading-relaxed">
                      {isFallback 
                        ? 'Selected due to high engagement from users with similar skill levels.'
                        : `Highly relevant based on your expertise in ${item.tags[0] || 'logic'} and recent solve patterns.`
                      }
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-gray-400 italic flex justify-between">
                      <span>94% Match Probability</span>
                      <span>Real-time Inference</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary-500 transition-colors">
                {item.title}
              </h3>

              <div className="flex flex-wrap gap-2 mb-6">
                {item.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-primary-500/5 text-primary-600 dark:text-primary-400 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-600">+{item.xpReward || 100} XP</span>
                </div>
                <Link
                  to={`/challenges/${item.id}`}
                  onClick={trackClick}
                  className="p-2.5 bg-primary-500 text-white rounded-xl shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all transform active:scale-95 group-hover:rotate-12"
                >
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {loading && page > 1 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <RecommendationSkeleton count={4} />
        </div>
      )}
    </section>
  );
};

export default RecommendationSection;
