import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Card } from '../../shared/components';
import { DifficultyBadge } from '../../components/Challenges';
import { Spinner } from '../../shared/components';
import { useCompetitionDetail } from './useCompetitionDetail';
import { useLeaderboard } from './useLeaderboard';
import {
  CompetitionHero,
  CompetitionOverview,
  CompetitionRules,
  LeaderboardTable,
  SubmissionPanel,
} from './components';

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [leaderboardLang, setLeaderboardLang] = useState('');
  const [leaderboardLimit, setLeaderboardLimit] = useState(50);

  const {
    competition,
    challenge,
    loading,
    error,
    selectedLang,
    setSelectedLang,
    code,
    setCode,
    submit,
    submitting,
    submitResult,
    submitError,
  } = useCompetitionDetail(id ?? undefined);

  const { entries: leaderboardEntries, loading: leaderboardLoading } = useLeaderboard(
    id,
    competition?.status,
    leaderboardLang,
    leaderboardLimit,
  );

  useEffect(() => {
    if (!submitResult) return;
    if (submitResult.status === 'accepted') {
      toast.success(submitResult.isBest ? 'Accepted! New best submission.' : 'Accepted!');
    } else {
      toast.error('Submission not accepted. Check your solution.');
    }
  }, [submitResult]);

  useEffect(() => {
    if (submitError) toast.error(submitError);
  }, [submitError]);

  const handleBack = () => navigate('/competitions');

  if (loading || !id) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-400" role="alert">{error ?? 'Competition not found'}</p>
        <Button variant="secondary" className="mt-4" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2 inline" /> Back to Contests
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6 text-gray-600 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-2"
        aria-label="Back to contests list"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Contests
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
          >
            <CompetitionHero competition={competition} />
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mt-4 mb-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{competition.description}</ReactMarkdown>
            </div>
            <CompetitionOverview competition={competition} />
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <CompetitionRules additionalRules={competition.rules} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Supported languages: {competition.supportedLanguages?.join(', ') || 'All'}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {challenge && (
              <motion.div
                key="challenge"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 [&_h2]:text-emerald-500 dark:[&_h2]:text-emerald-400" title={challenge.title}>
                  <div className="flex items-center gap-2 mb-3">
                    <DifficultyBadge difficulty={challenge.difficulty} />
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{challenge.description}</ReactMarkdown>
                  </div>
                  {challenge.examples?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 mb-2">Examples</h4>
                      {challenge.examples.map((ex, i) => (
                        <div key={i} className="mb-2 p-2 rounded bg-gray-100 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300">
                          <div>Input: <code className="text-emerald-600 dark:text-emerald-300">{ex.input}</code></div>
                          <div>Output: <code className="text-emerald-600 dark:text-emerald-300">{ex.output}</code></div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {challenge && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
            >
              <SubmissionPanel
                competition={competition}
                challenge={challenge}
                code={code}
                onCodeChange={setCode}
                selectedLang={selectedLang}
                onLanguageChange={setSelectedLang}
                onSubmit={submit}
                submitting={submitting}
                result={submitResult}
                error={submitError}
                theme={theme === 'dark' ? 'dark' : 'light'}
              />
            </motion.div>
          )}
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="lg:col-span-1"
        >
          <LeaderboardTable
            entries={leaderboardEntries}
            type={competition.type as any}
            loading={leaderboardLoading}
            languageFilter={leaderboardLang}
            onLanguageFilterChange={setLeaderboardLang}
            limit={leaderboardLimit}
            onLimitChange={setLeaderboardLimit}
            supportedLanguages={competition.supportedLanguages ?? []}
          />
        </motion.aside>
      </div>
    </div>
  );
}
