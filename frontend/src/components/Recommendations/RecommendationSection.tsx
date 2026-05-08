import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Info, ArrowRight, Zap, Target } from 'lucide-react';
import { challengesApi, type RecommendedChallengeItem } from '../../services/api';
import { RootState } from '../../store/store';
import RecommendationSkeleton from './RecommendationSkeleton';
import { DifficultyBadge } from '../Challenges';

interface Props {
  title?: string;
  limit?: number;
  showIcon?: boolean;
  context?: 'home' | 'detail';
}

const RecommendationSection: React.FC<Props> = ({ 
  title = "🔥 Trending for You", 
  limit = 4,
  showIcon = true,
  context = 'home'
}) => {
  const [items, setItems] = useState<RecommendedChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  
  const user = useSelector((state: RootState) => state.auth.user);
  const username = user?.username;
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        
        if (username) {
          // We pass the 'username' (handle) because the ML model was trained on usernames
          console.log(`[Recs] Fetching personalized for ${username}...`);
          const { data } = await challengesApi.getRecommendations(username, { limit });
          
          if (data.challenges && data.challenges.length > 0) {
            setItems(data.challenges);
            setIsFallback(false);
          } else {
            console.log('[Recs] No personalized results, trying fallback...');
            // Fallback to general challenges if personalized ones are empty
            const trending = await challengesApi.getAll({ limit });
            setItems(trending.data.items?.slice(0, limit) || []);
            setIsFallback(true);
          }
        } else {
          // Guest user: just show trending
          console.log('[Recs] Guest user, showing trending...');
          const trending = await challengesApi.getAll({ limit });
          setItems(trending.data.items?.slice(0, limit) || []);
          setIsFallback(true);
        }

        setError(false);
      } catch (err) {
        console.error('Failed to fetch recommendations, trying fallback', err);
        try {
          const trending = await challengesApi.getAll({ limit });
          setItems(trending.data.items?.slice(0, limit) || []);
          setIsFallback(true);
          setError(false);
        } catch (fallbackErr) {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [username, limit]);

  if (loading) return <div className="py-8"><RecommendationSkeleton /></div>;
  if (error || items.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-12 relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {showIcon && (
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary-500" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              AI-curated challenges based on your solving history
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
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-500/30 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <DifficultyBadge difficulty={item.difficulty} />
                <div className="group/info relative">
                  <Info className="w-4 h-4 text-gray-400 hover:text-primary-500 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-10 shadow-2xl">
                    <p className="font-semibold mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" /> 
                      {isFallback ? 'Trending Now' : 'Why this?'}
                    </p>
                    {isFallback 
                      ? 'This is a popular challenge among ByteBattle users today.'
                      : `Matches your expertise in ${item.tags[0] || 'algorithms'} and your preferred difficulty level.`
                    }
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary-500 transition-colors">
                {item.title}
              </h3>

              <div className="flex flex-wrap gap-2 mb-6">
                {item.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-[10px] font-medium rounded-md uppercase tracking-wider">
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
                  className="p-2 bg-primary-500 text-white rounded-xl shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all transform active:scale-95"
                >
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default RecommendationSection;
