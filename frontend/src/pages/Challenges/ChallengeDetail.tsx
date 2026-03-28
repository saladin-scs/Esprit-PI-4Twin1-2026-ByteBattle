import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { initVimMode } from 'monaco-vim';
import { Play, Send, Keyboard, AlignLeft, Lightbulb, ArrowLeft, Target, MessageCircle, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { challengesApi } from '../../services/api';
import { DifficultyBadge, LanguagePicker } from '../../components/Challenges';
import { SubmissionSuccessModal } from '../../components/Gamification/SubmissionSuccessModal';
import { useChallengeDetailStore } from '../../stores/challengeDetailStore';
import { useGamificationStore, type RankProgress } from '../../stores/gamificationStore';
import CommunitySolutions from './CommunitySolutions';
import { RootState } from '../../store/store';
import { CollaborationChat } from '../../shared/components/CollaborationChat';
import { AiCodeFeedbackPanel } from '../../shared/components/AiCodeFeedbackPanel';

const MONACO_LANG: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
};

interface Challenge {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  languages: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  tags: string[];
  xpReward: number;
  starterCode: Record<string, string>;
  hints?: Array<{ text: string; tier: string; cost: number }>;
}

interface RunResult {
  results: Array<{
    testNumber: number;
    passed: boolean;
    input?: string;
    expectedOutput?: string;
    actualOutput?: string;
    error?: string;
    executionTimeMs?: number;
  }>;
  overall: { passed: number; total: number };
  executionTimeMs?: number;
}

interface SubmissionResult {
  status: string;
  passedTests: number;
  totalTests: number;
  xpEarned: number;
  executionTimeMs: number;
  badgesUnlocked?: string[];
  testResults: Array<{
    testNumber: number;
    passed: boolean;
    input?: string;
    expectedOutput?: string;
    actualOutput?: string;
    error?: string;
  }>;
}

const ChallengeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();
  const langFromUrl = searchParams.get('lang');

  const {
    challenge,
    selectedLang,
    code,
    completedLanguages,
    loadingChallenge,
    loadingCompletion,
    error: storeError,
    setChallenge,
    setSelectedLang,
    setCode,
    setCompletedLanguages,
    setLoadingChallenge,
    setLoadingCompletion,
    setError: setStoreError,
    reset: resetStore,
  } = useChallengeDetailStore();

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState<
    'description' | 'result' | 'solutions' | 'chat' | 'coach'
  >('description');
  const isAuthed = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [isVimMode, setIsVimMode] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalPayload, setSuccessModalPayload] = useState<{
    xpEarned: number;
    badgesUnlocked: string[];
    rankProgress: RankProgress | null;
    totalXp: number;
    rankTier: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchGamificationSummary = useGamificationStore((s) => s.fetchSummary);

  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';
  const loading = loadingChallenge;
  const error = storeError;

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (editorRef.current) {
      if (isVimMode) {
        if (!vimModeRef.current) {
          const statusNode = document.getElementById('vim-status-node');
          vimModeRef.current = initVimMode(editorRef.current, statusNode);
        }
      } else {
        if (vimModeRef.current) {
          vimModeRef.current.dispose();
          vimModeRef.current = null;
        }
      }
    }
  }, [isVimMode]);

  useEffect(() => {
    if (!id) return;
    resetStore();
    const run = async () => {
      setLoadingChallenge(true);
      setStoreError(null);
      try {
        const res = await challengesApi.getOne(id);
        const data = res.data as Challenge;
        setChallenge(data as import('../../stores/challengeDetailStore').ChallengeDetailChallenge);
        const langs = data.languages ?? [];
        const preferred = langFromUrl && langs.includes(langFromUrl) ? langFromUrl : langs[0] || 'javascript';
        setSelectedLang(preferred);
        setCode(data.starterCode?.[preferred] || '');
      } catch {
        setStoreError('Challenge not found.');
      } finally {
        setLoadingChallenge(false);
      }
    };
    run();
  }, [id, langFromUrl, resetStore, setChallenge, setSelectedLang, setCode, setLoadingChallenge, setStoreError]);

  useEffect(() => {
    if (!id) return;
    setLoadingCompletion(true);
    challengesApi
      .getMyCompletion(id)
      .then((res) => {
        const list = (res.data as { completedLanguages: string[] }).completedLanguages ?? [];
        setCompletedLanguages(list);
      })
      .catch(() => setCompletedLanguages([]))
      .finally(() => setLoadingCompletion(false));
  }, [id, setCompletedLanguages, setLoadingCompletion]);

  // Sync URL lang → store (and code) when challenge is loaded so code always matches selected language
  useEffect(() => {
    if (!challenge || !langFromUrl || !challenge.languages?.includes(langFromUrl)) return;
    setSelectedLang(langFromUrl);
    const starter = challenge.starterCode?.[langFromUrl];
    if (starter != null) setCode(starter);
  }, [langFromUrl, challenge, setSelectedLang, setCode]);

  const handleLangChange = (lang: string) => {
    setSearchParams({ lang });
    setSelectedLang(lang);
    setCode(challenge?.starterCode?.[lang] || '');
  };

  const handleSelectLanguage = (lang: string) => {
    setSearchParams({ lang });
    setSelectedLang(lang);
    setCode(challenge?.starterCode?.[lang] || '');
  };

  const handleRun = async () => {
    if (!id) return;
    setRunning(true);
    setSubmitError(null);
    setRunResult(null);
    try {
      const res = await challengesApi.run(id, { code, language: selectedLang });
      setRunResult(res.data as RunResult);
      setActiveTab('result');
    } catch (err: any) {
      const raw = err?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw : err?.message || 'Run failed.';
      setSubmitError(msg);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    if (!id) return;
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    setRunResult(null);
    try {
      const res = await challengesApi.submit(id, { code, language: selectedLang });
      const data = res.data as SubmissionResult;
      setResult(data);
      setActiveTab('result');
      if (data.status === 'accepted') {
        try {
          const [comp, summary] = await Promise.all([
            challengesApi.getMyCompletion(id),
            fetchGamificationSummary(),
          ]);
          setCompletedLanguages((comp.data as { completedLanguages: string[] }).completedLanguages ?? []);
          if (summary) {
            setSuccessModalPayload({
              xpEarned: data.xpEarned ?? 0,
              badgesUnlocked: data.badgesUnlocked ?? [],
              rankProgress: summary.rankProgress ?? null,
              totalXp: summary.xp,
              rankTier: summary.rankTier,
            });
            setSuccessModalOpen(true);
          }
        } catch {
          // Modal/summary fetch failed; result is still shown
        }
      }
    } catch (err: any) {
      const raw = err?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw : err?.message || 'Submission failed.';
      setSubmitError(msg);
      setActiveTab('result');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }
  if (error || !challenge) {
    return (
      <div className="p-8 text-red-600 dark:text-red-400">
        {error || 'Challenge not found'}
      </div>
    );
  }

  // Page "Choix du langage": no lang in URL → show grid with Unsolved/Solved per language
  if (!langFromUrl) {
    return (
      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
        <div className="bb-hero-gradient-tall" aria-hidden />
        <button
          type="button"
          onClick={() => navigate('/challenges')}
          className="bb-link relative mb-6 inline-flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to challenges
        </button>
        <div className="relative mb-6 bb-card p-6">
          <div className="bb-kicker mb-3 w-fit">
            <Target className="h-3.5 w-3.5" aria-hidden />
            Challenge
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="bb-title-gradient text-2xl sm:text-3xl">{challenge.title}</h1>
            <DifficultyBadge difficulty={challenge.difficulty} />
            <span className="font-semibold text-amber-600 dark:text-amber-400">+{challenge.xpReward} XP</span>
          </div>
          <p className="bb-body-text flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            Complete once per language. Pick a language to open the editor.
          </p>
        </div>
        <div className="relative mb-4">
          <LanguagePicker
            languages={challenge.languages}
            completedLanguages={completedLanguages}
            onSelect={handleSelectLanguage}
            disabled={loadingCompletion}
            title="Choose language"
          />
        </div>
      </div>
    );
  }

  const displayResult = result ?? (runResult ? {
    status: runResult.overall.passed === runResult.overall.total ? 'accepted' : 'wrong_answer',
    passedTests: runResult.overall.passed,
    totalTests: runResult.overall.total,
    xpEarned: 0,
    executionTimeMs: runResult.executionTimeMs ?? 0,
    testResults: runResult.results.map((r, i) => ({
      testNumber: r.testNumber ?? i + 1,
      passed: r.passed,
      input: r.input,
      expectedOutput: r.expectedOutput,
      actualOutput: r.actualOutput,
      error: r.error,
    })),
  } as SubmissionResult : null);

  return (
    <>
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 font-sans dark:bg-slate-950">
      <Group {...({ direction: 'horizontal' } as any)}>
        <Panel defaultSize={45} minSize={30}>
          <div className="flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('description')}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'description'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Description
              </button>
              {(displayResult?.status === 'accepted' || (completedLanguages?.length ?? 0) > 0) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('solutions')}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'solutions'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Solutions
                </button>
              )}
              {(displayResult || submitError) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('result')}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'result'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Result {displayResult?.status === 'accepted' ? '✅' : displayResult ? '❌' : '⚠️'}
                </button>
              )}
              {isAuthed && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={`inline-flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'chat'
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('coach')}
                    className={`inline-flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'coach'
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Coach IA
                  </button>
                </>
              )}
            </div>

            {isAuthed && activeTab !== 'chat' && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                <span>
                  <span className="font-semibold">Chat en direct</span> — discutez avec les autres sur ce défi.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                >
                  Ouvrir le chat
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'description' && (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{challenge.title}</h2>
                    <DifficultyBadge difficulty={challenge.difficulty} />
                    <span className="ml-auto font-semibold text-amber-600 dark:text-amber-400">+{challenge.xpReward} XP</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {challenge.tags.map((t) => (
                      <span key={t} className="rounded px-2 py-0.5 text-xs bg-primary-500/10 text-primary-800 dark:text-primary-300">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mb-6 markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>
                      {challenge.description}
                    </ReactMarkdown>
                  </div>
                  {challenge.examples?.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-6 mb-2">Examples</h3>
                      {challenge.examples.map((ex, i) => (
                        <div key={i} className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
                          <div><strong>Input:</strong> <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 font-mono text-xs">{ex.input}</code></div>
                          <div className="mt-2"><strong>Output:</strong> <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 font-mono text-xs">{ex.output}</code></div>
                          {ex.explanation && <div className="mt-2 text-gray-600 dark:text-gray-400"><strong>Explanation:</strong> {ex.explanation}</div>}
                        </div>
                      ))}
                    </>
                  )}
                  {challenge.constraints?.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-6 mb-2">Constraints</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {challenge.constraints.map((c, i) => (
                          <li key={i}><code className="px-1 rounded bg-gray-200 dark:bg-gray-600 text-xs">{c}</code></li>
                        ))}
                      </ul>
                    </>
                  )}
                  {challenge.hints && challenge.hints.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-500" /> Hints ({challenge.hints.length})
                      </h3>
                      {challenge.hints.map((hint, i) => {
                        const isRevealed = revealedHints.includes(i);
                        return (
                          <div
                            key={i}
                            className={`mb-2 p-3 rounded-lg border text-sm ${
                              isRevealed
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            {isRevealed ? (
                              <div>
                                <strong className="block mb-1">Hint {i + 1} ({hint.tier})</strong>
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>{hint.text}</ReactMarkdown>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-gray-400">Hint {i + 1} hidden {hint.cost > 0 && `(${hint.cost} XP)`}</span>
                                <button
                                  type="button"
                                  onClick={() => setRevealedHints([...revealedHints, i])}
                                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                  Reveal
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'result' && (
                <div className="space-y-4">
                  {submitError && (
                    <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                      <div className="font-semibold">❌ Error</div>
                      <p className="mt-1 text-sm">{submitError}</p>
                    </div>
                  )}
                  {displayResult && (
                    <>
                      <div
                        className={`rounded-lg p-4 ${
                          displayResult.status === 'accepted'
                            ? 'border border-primary-500/30 bg-primary-500/10 text-primary-900 dark:text-primary-100'
                            : 'border border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-100'
                        }`}
                      >
                        <div className="font-semibold">
                          {displayResult.status === 'accepted' ? '✅ Accepted!' : displayResult.status === 'wrong_answer' ? '❌ Wrong Answer' : '❌ Runtime Error'}
                        </div>
                        <div className="mt-1 text-sm">
                          Tests: <strong>{displayResult.passedTests}/{displayResult.totalTests}</strong> passed · {displayResult.executionTimeMs}ms
                          {displayResult.xpEarned > 0 && <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">+{displayResult.xpEarned} XP 🎉</span>}
                        </div>
                        {displayResult.badgesUnlocked && displayResult.badgesUnlocked.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {displayResult.badgesUnlocked.map((name, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                🏅 {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {displayResult.testResults.map((t) => (
                        <div
                          key={t.testNumber}
                          className={`p-3 rounded-lg border text-sm ${
                            t.passed
                              ? 'border border-primary-500/25 bg-primary-500/5 dark:bg-primary-500/10'
                              : 'border border-red-500/25 bg-red-500/5 dark:bg-red-500/10'
                          }`}
                        >
                          <div className={`font-medium ${t.passed ? 'text-primary-800 dark:text-primary-300' : 'text-red-700 dark:text-red-300'}`}>
                            {t.passed ? '✅' : '❌'} Test #{t.testNumber}
                          </div>
                          {!t.passed && (
                            <div className="mt-2 space-y-1 text-xs">
                              {t.input != null && <div><strong>Input:</strong> <code className="ml-1">{t.input}</code></div>}
                              {t.expectedOutput != null && <div><strong>Expected:</strong> <code className="ml-1">{t.expectedOutput}</code></div>}
                              {t.actualOutput != null && <div><strong>Got:</strong> <code className="ml-1">{t.actualOutput}</code></div>}
                              {t.error && <div className="text-red-600 dark:text-red-400"><strong>Error:</strong> {t.error}</div>}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'solutions' && (
                <div className="h-full min-h-0">
                  <CommunitySolutions challengeId={id!} />
                </div>
              )}

              {activeTab === 'chat' && isAuthed && id && (
                <CollaborationChat
                  room={`challenge:${id}`}
                  title="Chat du défi"
                  className="h-[min(420px,calc(100vh-12rem))]"
                  enabled
                />
              )}

              {activeTab === 'coach' && isAuthed && challenge && (
                <AiCodeFeedbackPanel
                  code={code}
                  language={selectedLang}
                  taskDescription={`${challenge.title}\n\n${(challenge.description || '').slice(0, 12_000)}`}
                  testsPassed={displayResult?.status === 'accepted'}
                  executionError={
                    submitError ??
                    displayResult?.testResults?.find((t) => !t.passed)?.error ??
                    undefined
                  }
                  runtimeMs={displayResult?.executionTimeMs ?? runResult?.executionTimeMs}
                />
              )}
            </div>
          </div>
        </Panel>

        <Separator className="w-2 bg-gray-200 dark:bg-gray-700 hover:bg-primary-500/30 transition-colors cursor-col-resize" />

        <Panel minSize={30}>
          <Group {...({ direction: 'vertical' } as any)}>
            <Panel defaultSize={70} minSize={20}>
              <div className="h-full flex flex-col bg-gray-900">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {challenge.languages.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleLangChange(lang)}
                        className={`px-3 py-1.5 rounded text-sm font-medium ${
                          selectedLang === lang
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {lang}
                        {completedLanguages.includes(lang) && ' ✓'}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSearchParams({})}
                      className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-gray-200"
                      title="Change language"
                    >
                      Change language
                    </button>
                    <div className="w-px h-5 bg-gray-600" />
                    <button
                      type="button"
                      title="Vim mode"
                      className={`rounded p-1.5 ${isVimMode ? 'text-primary-400' : 'text-gray-400 hover:text-gray-300'}`}
                      onClick={() => setIsVimMode(!isVimMode)}
                    >
                      <Keyboard className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Format"
                      className="p-1.5 rounded text-gray-400 hover:text-gray-300"
                      onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRun}
                      disabled={running || !challenge.examples?.length}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="w-4 h-4" /> {running ? 'Running...' : 'Run'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <Editor
                    key={selectedLang}
                    height="100%"
                    onMount={handleEditorDidMount}
                    language={MONACO_LANG[selectedLang] || 'javascript'}
                    value={code}
                    onChange={(val) => setCode(val ?? '')}
                    theme={editorTheme}
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      tabSize: 2,
                      wordWrap: 'on',
                      automaticLayout: true,
                      padding: { top: 16 },
                    }}
                  />
                  <div id="vim-status-node" className={`flex h-6 items-center bg-primary-600 px-2 font-mono text-xs text-white ${isVimMode ? '' : 'hidden'}`} />
                </div>
              </div>
            </Panel>

            <Separator className="h-1.5 bg-gray-800 cursor-row-resize" />

            <Panel defaultSize={30} minSize={10}>
              <div className="h-full flex flex-col bg-gray-900 text-gray-200">
                <div className="px-4 py-2 border-b border-gray-700 text-sm font-semibold">Test cases</div>
                <div className="flex-1 overflow-y-auto p-4 text-sm">
                  {challenge.examples?.length > 0 ? (
                    <>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {challenge.examples.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedTestCase(i)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              selectedTestCase === i
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Case {i + 1}
                          </button>
                        ))}
                      </div>
                      {challenge.examples[selectedTestCase] && (
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs uppercase font-semibold text-gray-400 mb-1">Input</div>
                            <pre className="p-3 rounded bg-gray-800 text-gray-200 font-mono text-xs whitespace-pre-wrap">
                              {challenge.examples[selectedTestCase].input}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs uppercase font-semibold text-gray-400 mb-1">Expected output</div>
                            <pre className="p-3 rounded bg-gray-800 text-gray-200 font-mono text-xs whitespace-pre-wrap">
                              {challenge.examples[selectedTestCase].output}
                            </pre>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-400">No examples. Run or submit to see results.</p>
                  )}
                </div>
              </div>
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>

    {successModalOpen && successModalPayload && (
      <SubmissionSuccessModal
        open={successModalOpen}
        onClose={() => { setSuccessModalOpen(false); setSuccessModalPayload(null); }}
        xpEarned={successModalPayload.xpEarned}
        badgesUnlocked={successModalPayload.badgesUnlocked}
        rankProgress={successModalPayload.rankProgress}
        totalXp={successModalPayload.totalXp}
        rankTier={successModalPayload.rankTier}
      />
    )}
    </>
  );
};

export default ChallengeDetail;
