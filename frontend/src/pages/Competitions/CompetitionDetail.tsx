import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, MessageCircle, Send } from 'lucide-react';
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
import { RootState } from '../../store/store';
import { CollaborationChat } from '../../shared/components/CollaborationChat';
import { AiCodeFeedbackPanel } from '../../shared/components/AiCodeFeedbackPanel';

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [leaderboardLang, setLeaderboardLang] = useState('');
  const [leaderboardLimit, setLeaderboardLimit] = useState(25);
  const [submitChallengeId, setSubmitChallengeId] = useState('');
  const [lastSubmittedChallengeId, setLastSubmittedChallengeId] = useState('');
  const isAuthed = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isAdmin = useSelector((s: RootState) => Boolean(s.auth.user?.roles?.includes('admin')));

  const {
    competition,
    challenges,
    loading,
    error,
    getChallengeState,
    setSelectedLang,
    setCode,
    run,
    submit,
  } = useCompetitionDetail(id ?? undefined);

  const { entries: leaderboardEntries, loading: leaderboardLoading } = useLeaderboard(
    id,
    competition?.status,
    leaderboardLang,
    leaderboardLimit,
  );

  const handleBack = () => navigate('/competitions');

  if (loading || !id) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3" aria-busy="true">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading contest...</p>
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-red-700 dark:text-red-300" role="alert">
            {error ?? 'Competition not found'}
          </p>
          <Button variant="secondary" className="mt-6" onClick={handleBack}>
            <ArrowLeft className="mr-2 inline h-4 w-4" /> Back to contests
          </Button>
        </div>
      </div>
    );
  }

  const activeSubmitChallengeId = submitChallengeId || challenges[0]?._id || '';
  const activeSubmitState = activeSubmitChallengeId ? getChallengeState(activeSubmitChallengeId) : null;
  const lastSubmittedState = lastSubmittedChallengeId ? getChallengeState(lastSubmittedChallengeId) : null;
  const lastSubmittedChallenge = challenges.find((challenge) => challenge._id === lastSubmittedChallengeId);

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="bb-hero-gradient-detail" aria-hidden />
      <Button
        variant="ghost"
        onClick={handleBack}
        className="bb-link relative mb-6"
        aria-label="Back to contests list"
      >
        <ArrowLeft className="h-4 w-4" /> Back to contests
      </Button>

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bb-card overflow-hidden p-6"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="mt-1 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
              <div className="min-w-0 flex-1">
                <CompetitionHero competition={competition} />
                <div className="prose prose-sm max-w-none text-slate-600 dark:prose-invert dark:text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{competition.description}</ReactMarkdown>
                </div>
              </div>
            </div>

            <CompetitionOverview
              competition={competition}
              className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700"
            />
            <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
              <CompetitionRules additionalRules={competition.rules} />
            </div>
            <p className="bb-body-text mt-4 text-xs">
              Languages:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {competition.supportedLanguages?.map((lang) => (lang === 'cpp' ? 'C++' : lang)).join(' · ') || 'All'}
              </span>
            </p>
          </motion.div>

          {challenges.length > 0 && !isAdmin && (
            <div className="sticky top-4 z-20 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-emerald-100">Challenge to submit</label>
                  <select
                    value={activeSubmitChallengeId}
                    onChange={(event) => setSubmitChallengeId(event.target.value)}
                    className="w-full rounded-lg border border-emerald-500/30 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  >
                    {challenges.map((challenge) => (
                      <option key={challenge._id} value={challenge._id}>
                        {challenge.title}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => {
                    if (!activeSubmitChallengeId) return;
                    setLastSubmittedChallengeId(activeSubmitChallengeId);
                    submit(activeSubmitChallengeId);
                  }}
                  disabled={!activeSubmitChallengeId || Boolean(activeSubmitState?.submitting) || competition.status !== 'active'}
                  loading={Boolean(activeSubmitState?.submitting)}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                >
                  <Send className="h-4 w-4" aria-hidden />
                  {activeSubmitState?.submitting ? 'Submitting...' : 'Submit selected challenge'}
                </Button>
              </div>
              {competition.status !== 'active' && (
                <p className="mt-2 text-sm text-amber-300">Submissions are closed for this contest.</p>
              )}
              {lastSubmittedChallenge && lastSubmittedState?.submitError && (
                <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-sm text-red-100">
                  <p className="font-semibold">Submission failed for {lastSubmittedChallenge.title}</p>
                  <p className="mt-1">{lastSubmittedState.submitError}</p>
                </div>
              )}
              {lastSubmittedChallenge && lastSubmittedState?.submitResult && (
                <div
                  className={`mt-3 rounded-xl border p-3 text-sm ${
                    lastSubmittedState.submitResult.status === 'accepted'
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                      : 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                  }`}
                >
                  <p className="font-semibold">
                    {lastSubmittedState.submitResult.status === 'accepted'
                      ? `${lastSubmittedChallenge.title}: code correct`
                      : `${lastSubmittedChallenge.title}: resultat incorrect`}
                  </p>
                  <p className="mt-1">
                    Tests: {lastSubmittedState.submitResult.passedTests}/{lastSubmittedState.submitResult.totalTests}
                  </p>
                  <p className="mt-1">
                    Temps: {lastSubmittedState.submitResult.executionTimeMs} ms
                  </p>
                </div>
              )}
            </div>
          )}

          {challenges.map((challenge, index) => {
            const state = getChallengeState(challenge._id);
            if (!state) return null;

            return (
              <motion.div
                key={challenge._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className="space-y-4"
              >
                <Card
                  className="bb-card [&_h2]:text-primary-600 dark:[&_h2]:text-primary-400"
                  title={challenge.title}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <DifficultyBadge difficulty={challenge.difficulty} />
                    <span className="text-xs text-slate-500">Statement · code editor below</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-600 dark:prose-invert dark:text-slate-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{challenge.description}</ReactMarkdown>
                  </div>
                  {challenge.examples?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="bb-section-title mb-2 text-sm">Examples</h4>
                      {challenge.examples.map((example, exampleIndex) => (
                        <div
                          key={exampleIndex}
                          className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-600 dark:bg-slate-800/50"
                        >
                          <div>
                            Input: <code className="bb-code">{example.input}</code>
                          </div>
                          <div>
                            Output: <code className="bb-code">{example.output}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <SubmissionPanel
                  competition={competition}
                  challenge={challenge}
                  code={state.code}
                  onCodeChange={(value) => setCode(challenge._id, value)}
                  selectedLang={state.selectedLang}
                  onLanguageChange={(lang) => setSelectedLang(challenge._id, lang)}
                  onRun={() => run(challenge._id)}
                  running={state.running}
                  runResult={state.runResult}
                  result={state.submitResult}
                  error={state.submitError}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                  isAdmin={isAdmin}
                />

                {isAuthed && (
                  <div className="mt-4">
                    <AiCodeFeedbackPanel
                      code={state.code}
                      language={state.selectedLang}
                      taskDescription={`${competition.name} — ${challenge.title}\n\n${(challenge.description || '').slice(0, 8000)}`}
                      testsPassed={state.submitResult?.status === 'accepted'}
                      executionError={state.submitError ?? undefined}
                      runtimeMs={state.submitResult?.executionTimeMs}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
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
          {isAuthed && (
            <div className="mt-6">
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                Discussion room - same column as the leaderboard (scroll if needed).
              </p>
              <CollaborationChat
                room={`competition:${id}`}
                title="Competition chat"
                className="min-h-[280px]"
                enabled
              />
            </div>
          )}
        </motion.aside>
      </div>
    </div>
  );
}
