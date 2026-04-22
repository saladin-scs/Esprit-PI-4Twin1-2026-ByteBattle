import { useEffect, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { initVimMode } from 'monaco-vim';
import {
  Play,
  Send,
  Keyboard,
  AlignLeft,
  Lightbulb,
  ArrowLeft,
  Target,
  MessageCircle,
  Sparkles,
  Timer,
  Code2,
  Clock,
  BarChart3,
  Terminal,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import { challengesApi } from '../../services/api';
import { DifficultyBadge, LanguagePicker } from '../../components/Challenges';
import { SubmissionSuccessModal } from '../../components/Gamification/SubmissionSuccessModal';
import { useChallengeDetailStore } from '../../stores/challengeDetailStore';
import { useGamificationStore, type RankProgress } from '../../stores/gamificationStore';
import CommunitySolutions from './CommunitySolutions';
import { SiteRatingWidget } from '../Home/SiteRatingWidget';
import { RootState } from '../../store/store';
import { CollaborationChat } from '../../shared/components/CollaborationChat';
import { AiCodeFeedbackPanel } from '../../shared/components/AiCodeFeedbackPanel';
import { Modal } from '../../shared/components';

const MONACO_LANG: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
};

const HINT_TIER_LABEL: Record<string, string> = {
  basic: 'Light hint',
  detailed: 'Detailed hint',
  premium: 'Advanced hint',
};

function formatAttemptClock(elapsedMs: number): string {
  const s = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

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
  xpModifiers?: {
    timeMultiplier: number;
    hintFlatPenalty: number;
    elapsedMs: number;
  };
  testResults: Array<{
    testNumber: number;
    passed: boolean;
    /** Submission hidden case: input/output not exposed (server anti-cheat). */
    isHiddenCase?: boolean;
    message?: string;
    input?: string;
    expectedOutput?: string;
    actualOutput?: string;
    error?: string;
  }>;
}

interface SubmissionHistoryItem {
  _id: string;
  status: string;
  passedTests: number;
  totalTests: number;
  executionTimeMs: number;
  language: string;
  createdAt: string;
}

interface ChallengeAnalyticsView {
  totalSolved: number;
  totalParticipated: number;
  avgAttempts: number;
  solveRate: number;
}

const ChallengeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const langFromUrl = searchParams.get('lang');
  /** Global theme before opening IDE (restored when leaving URL with ?lang=). */
  const challengeIdeThemeRef = useRef<Theme | null>(null);

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
  const [leftPanelTab, setLeftPanelTab] = useState<'description' | 'chat'>('description');
  const [bottomPanelTab, setBottomPanelTab] = useState<
    'testcases' | 'hints' | 'result' | 'solutions' | 'official-solution' | 'attempts' | 'analytics' | 'coach'
  >('testcases');
  const [challengeAnalytics, setChallengeAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const isAuthed = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [isVimMode, setIsVimMode] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
  const [progressSolved, setProgressSolved] = useState(false);
  const [attemptTick, setAttemptTick] = useState(0);
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
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistoryItem[]>([]);
  const [showHistoryAfterAttempts, setShowHistoryAfterAttempts] = useState(false);
  const [officialSolutionCode, setOfficialSolutionCode] = useState<string | null>(null);
  const [officialSolutionLoading, setOfficialSolutionLoading] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<ChallengeAnalyticsView | null>(null);

  const [mobileTab, setMobileTab] = useState<'description' | 'editor' | 'console'>('description');
  const fetchGamificationSummary = useGamificationStore((s) => s.fetchSummary);

  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);
  const prevChallengeIdRef = useRef<string | undefined>(undefined);
  const prevLangParamRef = useRef<string | null>(null);

  /** `vs` is a clearer Monaco light theme than `light` (better syntax contrast). */
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  const loading = loadingChallenge;
  const error = storeError;

  // On IDE open (?lang=), switch to dark theme for LeetCode-like rendering; restore on exit.
  /* eslint-disable react-hooks/exhaustive-deps -- do not depend on `theme` to allow manual page toggle */
  useEffect(() => {
    if (!langFromUrl) {
      if (challengeIdeThemeRef.current !== null) {
        setTheme(challengeIdeThemeRef.current);
        challengeIdeThemeRef.current = null;
      }
      return;
    }
    if (challengeIdeThemeRef.current === null) {
      challengeIdeThemeRef.current = theme;
    }
    setTheme('dark');
  }, [langFromUrl, setTheme]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Always show Description tab when opening a challenge or moving from language picker to editor (?lang=).
  useEffect(() => {
    const idChanged = id !== prevChallengeIdRef.current;
    const langJustOpened = Boolean(langFromUrl) && prevLangParamRef.current === null;
    prevChallengeIdRef.current = id;
    prevLangParamRef.current = langFromUrl;
    if (idChanged || langJustOpened) {
      setLeftPanelTab('description');
      setBottomPanelTab('testcases');
    }
  }, [id, langFromUrl]);

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

  useEffect(() => {
    if (!id || !isAuthed) {
      setAttemptStartedAt(null);
      setProgressSolved(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await challengesApi.getChallengeProgress(id);
        if (cancelled) return;
        if (data.solved) {
          setProgressSolved(true);
          setAttemptStartedAt(null);
        } else {
          setProgressSolved(false);
          setAttemptStartedAt(data.startedAt);
          setRevealedHints(data.revealedHintIndices ?? []);
        }
      } catch {
        if (!cancelled) setAttemptStartedAt(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isAuthed]);

  useEffect(() => {
    if (!attemptStartedAt || progressSolved) return;
    const t = window.setInterval(() => setAttemptTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [attemptStartedAt, progressSolved]);

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

  const attemptElapsedMs = useMemo(() => {
    if (!attemptStartedAt || progressSolved) return 0;
    void attemptTick;
    return Date.now() - new Date(attemptStartedAt).getTime();
  }, [attemptStartedAt, progressSolved, attemptTick]);

  const attemptsUsed = Math.min(submissionHistory.length, 5);
  const runsLeft = Math.max(0, 5 - attemptsUsed);
  const unlockAdvancedTabs = progressSolved || showHistoryAfterAttempts;

  const handleRevealHint = async (hintIndex: number) => {
    if (!id) return;
    if (!isAuthed) {
      setRevealedHints((prev) => [...new Set([...prev, hintIndex])].sort((a, b) => a - b));
      return;
    }
    try {
      const { data } = await challengesApi.revealChallengeHint(id, hintIndex);
      setAttemptStartedAt(data.startedAt);
      setRevealedHints(data.revealedHintIndices);
    } catch {
      setRevealedHints((prev) => [...new Set([...prev, hintIndex])].sort((a, b) => a - b));
    }
  };

  const loadOfficialSolution = async (lang: string) => {
    if (!id || !lang) return;
    setOfficialSolutionLoading(true);
    try {
      const res = await challengesApi.getOfficialSolution(id, { language: lang });
      const data = res.data as any;
      const code = typeof data?.code === 'string' ? data.code : null;
      setOfficialSolutionCode(code);
    } catch {
      setOfficialSolutionCode(null);
    } finally {
      setOfficialSolutionLoading(false);
    }
  };

  useEffect(() => {
    if (!id || !isAuthed) {
      setSubmissionHistory([]);
      setShowHistoryAfterAttempts(false);
      return;
    }
    let cancelled = false;
    challengesApi
      .getMyHistory(id)
      .then((res) => {
        if (cancelled) return;
        const history = (Array.isArray(res.data) ? res.data : []) as SubmissionHistoryItem[];
        setSubmissionHistory(history);
        setShowHistoryAfterAttempts(history.length >= 5);
      })
      .catch(() => {
        if (!cancelled) {
          setSubmissionHistory([]);
          setShowHistoryAfterAttempts(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAuthed, result?.status]);

  useEffect(() => {
    if (!selectedLang) return;
    const shouldLoad = progressSolved || showHistoryAfterAttempts;
    if (!shouldLoad) {
      setOfficialSolutionCode(null);
      return;
    }
    void loadOfficialSolution(selectedLang);
  }, [selectedLang, progressSolved, showHistoryAfterAttempts]);

  const loadAnalytics = async () => {
    if (!id) return;
    setAnalyticsLoading(true);
    try {
      const res = await challengesApi.getChallengeAnalytics(id);
      const data = (res.data as any) || {};
      const stats = data.statistics || data;
      const totalSolved = Number(stats.totalSolved ?? 0);
      const totalParticipated = Number(stats.totalParticipated ?? 0);
      const avgAttempts = Number(stats.avgAttempts ?? 0);
      const solveRate = totalParticipated > 0 ? totalSolved / totalParticipated : 0;
      setChallengeAnalytics(data);
      setAnalyticsView({ totalSolved, totalParticipated, avgAttempts, solveRate });
    } catch {
      try {
        // Fallback for non-admin users: public stats endpoint.
        const statsRes = await challengesApi.getChallengeStats(id);
        const stats = (statsRes.data as any) || {};
        const totalSolved = Number(stats.totalAccepted ?? 0);
        const totalParticipated = Number(stats.totalSubmissions ?? 0);
        const avgAttempts = 0;
        const solveRate = Number(stats.acceptanceRate ?? 0) / 100;
        setChallengeAnalytics(stats);
        setAnalyticsView({ totalSolved, totalParticipated, avgAttempts, solveRate });
      } catch {
        setChallengeAnalytics(null);
        setAnalyticsView(null);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (bottomPanelTab === 'analytics' && !challengeAnalytics && !analyticsLoading && id) {
      void loadAnalytics();
    }
  }, [bottomPanelTab, id]);

  const handleRun = async () => {
    if (!id) return;
    setRunning(true);
    setSubmitError(null);
    setRunResult(null);
    try {
      const res = await challengesApi.run(id, { code, language: selectedLang });
      setRunResult(res.data as RunResult);
      setBottomPanelTab('result');
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
      setBottomPanelTab('result');
      setShowRatingModal(true);
      if (data.status === 'accepted') {
        setProgressSolved(true);
        setAttemptStartedAt(null);
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

      try {
        const historyRes = await challengesApi.getMyHistory(id);
        const history = (Array.isArray(historyRes.data) ? historyRes.data : []) as SubmissionHistoryItem[];
        setSubmissionHistory(history);
        setShowHistoryAfterAttempts(history.length >= 5);
      } catch {
        // Ignore history refresh failures after submit
      }
    } catch (err: any) {
      const raw = err?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw : err?.message || 'Submission failed.';
      setSubmitError(msg);
      setBottomPanelTab('result');
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

  // Language selection page: no lang in URL -> show grid with Unsolved/Solved per language
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
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #484f58;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-slate-50 font-sans dark:bg-[#010409] p-1 lg:p-2">
        
        {/* DESKTOP VIEW: Split Panels (IntelliJ Style) */}
        <div className="hidden lg:flex flex-1 flex-col overflow-hidden">
          <Group direction="vertical">
            {/* TOP AREA: Workspace (Description + Editor) */}
            <Panel defaultSize={65} minSize={30}>
              <Group direction="horizontal">
                {/* CARD 1: Top Left Panel (Description + Discussion) */}
                <Panel defaultSize={40} minSize={25}>
                  <div className="flex h-full flex-col bg-white dark:bg-[#0d1117] rounded-xl border border-slate-200 dark:border-[#30363d] overflow-hidden shadow-sm">
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/50 px-2 dark:border-[#30363d] dark:bg-[#161b22]/50">
                      <div role="tablist" className="flex">
                        <button
                          type="button"
                          onClick={() => setLeftPanelTab('description')}
                          className={`px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${
                            leftPanelTab === 'description'
                              ? 'border-primary-500 text-primary-600 dark:border-[#1f6feb] dark:text-[#58a6ff]'
                              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-[#8b949e] dark:hover:text-[#c9d1d9]'
                          }`}
                        >
                          Description
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeftPanelTab('chat')}
                          className={`px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 inline-flex items-center gap-1.5 ${
                            leftPanelTab === 'chat'
                              ? 'border-primary-500 text-primary-600 dark:border-[#1f6feb] dark:text-[#58a6ff]'
                              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-[#8b949e] dark:hover:text-[#c9d1d9]'
                          }`}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Discussion
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      {leftPanelTab === 'description' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                          <div className="mb-6 flex flex-wrap items-center gap-3">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{challenge.title}</h2>
                            <DifficultyBadge difficulty={challenge.difficulty} />
                            <div className="ml-auto px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-500/20">
                              +{challenge.xpReward} XP
                            </div>
                          </div>
                          <div className="mb-8 flex flex-wrap gap-2">
                            {challenge.tags.map((t) => (
                              <span key={t} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter text-slate-500 dark:border-[#30363d] dark:bg-[#161b22] dark:text-slate-400">
                                {t}
                              </span>
                            ))}
                          </div>
                          <div className="markdown-body prose prose-slate prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>
                              {challenge.description}
                            </ReactMarkdown>
                          </div>
                          {challenge.constraints?.length > 0 && (
                            <div className="mt-10 p-5 bg-slate-50/50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                              <h3 className="mb-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Constraints</h3>
                              <ul className="space-y-3">
                                {challenge.constraints.map((c, i) => (
                                   <li key={i} className="flex items-start gap-3 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                     <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50" />
                                     {c}
                                   </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {leftPanelTab === 'chat' && (
                        <div className="h-full animate-in fade-in duration-500">
                          <CollaborationChat
                            room={`challenge:${id}`}
                            title="Challenge Discussion"
                            className="h-full"
                            enabled
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>

                <Separator className="w-1 cursor-col-resize bg-transparent hover:bg-primary-500/10 transition-colors" />

                {/* CARD 2: Top Right Panel (Editor) */}
                <Panel defaultSize={60} minSize={30}>
                  <div className="flex h-full flex-col bg-white dark:bg-[#0d1117] rounded-xl border border-slate-200 dark:border-[#30363d] overflow-hidden shadow-sm">
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4 py-2 dark:border-[#30363d] dark:bg-[#161b22]/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 p-1 bg-slate-200/50 dark:bg-[#21262d] rounded-xl">
                          {challenge.languages.map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => handleLangChange(lang)}
                              className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                selectedLang === lang
                                  ? 'bg-white text-primary-600 shadow-sm dark:bg-[#30363d] dark:text-[#58a6ff]'
                                  : 'text-slate-500 hover:bg-white/50 dark:text-[#8b949e] dark:hover:bg-[#30363d]/50'
                              }`}
                            >
                              {lang}{completedLanguages.includes(lang) && ' ✓'}
                            </button>
                          ))}
                        </div>
                        <div className="h-4 w-px bg-slate-300 dark:bg-[#30363d] mx-1" />
                        <button type="button" onClick={() => setIsVimMode(!isVimMode)} className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-[#30363d] transition-colors ${isVimMode ? 'text-primary-500 bg-primary-100/50' : 'text-slate-400'}`} title="Vim Mode"><Keyboard className="h-4 w-4" /></button>
                        <button type="button" onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-[#30363d] transition-colors text-slate-400" title="Format"><AlignLeft className="h-4 w-4" /></button>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {attemptStartedAt && !progressSolved && (
                          <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-black font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20">
                            <Timer className="h-3.5 w-3.5" />
                            {formatAttemptClock(attemptElapsedMs)}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleRun}
                          disabled={running}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:bg-[#21262d] dark:text-[#c9d1d9] dark:hover:bg-[#30363d] transition-all"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" /> {running ? 'Runs...' : 'Run'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-white hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-500/30 dark:bg-[#238636] dark:hover:bg-[#2ea043] transition-all"
                        >
                          <Send className="h-3.5 w-3.5 fill-current" /> {submitting ? 'Submits...' : 'Submit'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 relative bg-[#fffffe] dark:bg-[#0d1117] overflow-hidden">
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
                          padding: { top: 20 },
                        }}
                      />
                      <div id="vim-status-node" className={`absolute bottom-0 left-0 right-0 h-6 bg-primary-600 px-3 font-mono text-[10px] text-white flex items-center z-10 font-bold ${isVimMode ? '' : 'hidden'}`} />
                    </div>
                  </div>
                </Panel>
              </Group>
            </Panel>

            <Separator className="h-1 cursor-row-resize bg-transparent hover:bg-primary-500/10 transition-colors flex items-center justify-center">
              <div className="w-12 h-1 bg-slate-300 dark:bg-[#30363d] rounded-full opacity-40" />
            </Separator>

            {/* BOTTOM AREA: Full-width Console (Tabs for results/hints/etc) */}
            <Panel defaultSize={35} minSize={10} collapsible={true}>
              <div className="flex h-full flex-col bg-[#ffffff] dark:bg-[#0d1117] overflow-hidden">
                {/* IDE-Style Tab Bar */}
                <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 dark:border-[#30363d] dark:bg-[#161b22]">
                  <div className="flex items-center">
                    <div className="px-5 py-2.5 text-[10px] font-black text-slate-400 dark:text-[#8b949e] border-r border-slate-200 dark:border-[#30363d] uppercase tracking-[0.2em] flex items-center gap-2">
                      <Terminal className="h-3 w-3" /> Console
                    </div>
                    <div className="flex overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setBottomPanelTab('testcases')}
                        className={`px-5 py-2.5 text-[11px] font-bold transition-all border-r border-slate-200 dark:border-[#30363d] flex items-center gap-2 whitespace-nowrap ${
                          bottomPanelTab === 'testcases'
                            ? 'bg-white dark:bg-[#0d1117] text-primary-600 dark:text-[#58a6ff]'
                            : 'text-slate-500 hover:bg-slate-200 dark:text-[#8b949e] dark:hover:bg-[#30363d]'
                        }`}
                      >
                        Test Cases <span className="text-[9px] opacity-40">×</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBottomPanelTab('result')}
                        className={`px-5 py-2.5 text-[11px] font-bold transition-all border-r border-slate-200 dark:border-[#30363d] flex items-center gap-2 whitespace-nowrap ${
                          bottomPanelTab === 'result'
                            ? 'bg-white dark:bg-[#0d1117] text-primary-600 dark:text-[#58a6ff]'
                            : 'text-slate-500 hover:bg-slate-200 dark:text-[#8b949e] dark:hover:bg-[#30363d]'
                        }`}
                      >
                        Output {displayResult?.status === 'accepted' ? '✓' : displayResult ? '✗' : ''} <span className="text-[9px] opacity-40">×</span>
                      </button>
                      {challenge.hints && challenge.hints.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setBottomPanelTab('hints')}
                          className={`px-5 py-2.5 text-[11px] font-bold transition-all border-r border-slate-200 dark:border-[#30363d] flex items-center gap-2 whitespace-nowrap ${
                            bottomPanelTab === 'hints'
                              ? 'bg-white dark:bg-[#0d1117] text-amber-600 dark:text-amber-400'
                              : 'text-slate-500 hover:bg-slate-200 dark:text-[#8b949e] dark:hover:bg-[#30363d]'
                          }`}
                        >
                          Hints <span className="text-[9px] opacity-40">×</span>
                        </button>
                      )}
                      {(displayResult?.status === 'accepted' || (completedLanguages?.length ?? 0) > 0) && (
                        <button
                          type="button"
                          onClick={() => setBottomPanelTab('solutions')}
                          className={`px-5 py-2.5 text-[11px] font-bold transition-all border-r border-slate-200 dark:border-[#30363d] whitespace-nowrap ${
                            bottomPanelTab === 'solutions'
                              ? 'bg-white dark:bg-[#0d1117] text-primary-600 dark:text-[#58a6ff]'
                              : 'text-slate-500 hover:bg-slate-200 dark:text-[#8b949e] dark:hover:bg-[#30363d]'
                          }`}
                        >
                          Community
                        </button>
                      )}
                      {unlockAdvancedTabs && (
                        <>
                          <button
                            type="button"
                            onClick={() => setBottomPanelTab('official-solution')}
                            className={`px-5 py-2.5 text-[11px] font-bold transition-all border-r border-slate-200 dark:border-[#30363d] whitespace-nowrap ${
                              bottomPanelTab === 'official-solution'
                                ? 'bg-white dark:bg-[#0d1117] text-primary-600 dark:text-[#58a6ff]'
                                : 'text-slate-500 hover:bg-slate-200 dark:text-[#8b949e] dark:hover:bg-[#30363d]'
                            }`}
                          >
                            Official
                          </button>
                          <button
                            type="button"
                            onClick={() => setBottomPanelTab('analytics')}
                            className={`px-5 py-2.5 text-[11px] font-bold transition-all border-r border-slate-200 dark:border-[#30363d] whitespace-nowrap ${
                              bottomPanelTab === 'analytics'
                                ? 'bg-white dark:bg-[#0d1117] text-primary-600 dark:text-[#58a6ff]'
                                : 'text-slate-500 hover:bg-slate-200 dark:text-[#8b949e] dark:hover:bg-[#30363d]'
                            }`}
                          >
                            Statistics
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pr-4">
                     <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><Search className="h-3.5 w-3.5" /></button>
                     <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors" title="Collapse"><ChevronDown className="h-4 w-4" /></button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar dark:bg-black/20">
                  {bottomPanelTab === 'testcases' && (
                    <div className="animate-in fade-in duration-200 p-6">
                      {challenge.examples?.length > 0 ? (
                        <>
                          <div className="mb-6 flex flex-wrap gap-2">
                            {challenge.examples.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setSelectedTestCase(i)}
                                className={`rounded-md px-4 py-1.5 text-[11px] font-bold transition-all ${
                                  selectedTestCase === i
                                    ? 'bg-primary-600 text-white dark:bg-[#1f6feb]'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#30363d] dark:text-[#c9d1d9]'
                                }`}
                              >
                                case {i + 1}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-[#8b949e] uppercase tracking-widest flex items-center gap-2">
                                <Terminal className="h-3 w-3" /> Input
                              </span>
                              <pre className="p-5 bg-slate-50 dark:bg-[#010409] border border-slate-200 dark:border-[#30363d] rounded-lg font-mono text-[12px] whitespace-pre-wrap leading-relaxed dark:text-[#c9d1d9] shadow-inner">{challenge.examples[selectedTestCase].input}</pre>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-[#8b949e] uppercase tracking-widest flex items-center gap-2">
                                <Target className="h-3 w-3" /> Expected
                              </span>
                              <pre className="p-5 bg-slate-50 dark:bg-[#010409] border border-slate-200 dark:border-[#30363d] rounded-lg font-mono text-[12px] whitespace-pre-wrap leading-relaxed dark:text-[#d29922] shadow-inner">{challenge.examples[selectedTestCase].output}</pre>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 opacity-30">
                           <Target className="h-10 w-10 mb-3" />
                           <p className="text-[10px] font-bold uppercase tracking-widest">No examples available.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {bottomPanelTab === 'result' && (
                     <div className="animate-in fade-in duration-200 p-6 space-y-6">
                      {(!displayResult && !submitError) && (
                        <div className="flex flex-col items-center justify-center py-16 opacity-30">
                           <Play className="h-10 w-10 mb-3" />
                           <p className="text-[10px] font-bold uppercase tracking-widest">Execute code to see log output.</p>
                        </div>
                      )}
                      {submitError && (
                        <div className="p-5 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                          <h4 className="text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">● Compilation Error</h4>
                          <pre className="font-mono text-xs whitespace-pre-wrap opacity-80">{submitError}</pre>
                        </div>
                      )}
                      {displayResult && (
                        <>
                          <div className={`p-6 rounded-lg border ${displayResult.status === 'accepted' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20' : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20'}`}>
                             <div className="flex items-center justify-between mb-6">
                                <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${displayResult.status === 'accepted' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                  {displayResult.status === 'accepted' ? '● Challenge Completed' : '● Verification Failed'}
                                </h4>
                                <div className="text-[10px] font-mono opacity-60">Time: {displayResult.executionTimeMs}ms</div>
                             </div>
                             <div className="flex gap-8">
                                <div>
                                  <div className="text-[9px] text-slate-400 dark:text-[#8b949e] font-bold uppercase tracking-widest mb-1">Pass Rate</div>
                                  <div className="text-xl font-bold dark:text-white">{displayResult.passedTests} / {displayResult.totalTests}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-slate-400 dark:text-[#8b949e] font-bold uppercase tracking-widest mb-1">Points</div>
                                  <div className="text-xl font-bold text-amber-500">+{displayResult.xpEarned} XP</div>
                                </div>
                             </div>
                          </div>
                          <div className="space-y-1.5">
                             <div className="text-[10px] font-bold text-slate-400 dark:text-[#8b949e] uppercase tracking-widest mb-2">Detailed Logs</div>
                             {displayResult.testResults.map((t, idx) => (
                               <div key={idx} className={`p-4 rounded-md border flex items-center justify-between bg-white dark:bg-[#0d1117] ${t.passed ? 'border-slate-200 dark:border-[#30363d]' : 'border-red-200 dark:border-red-900/30'}`}>
                                  <div className="flex items-center gap-4">
                                    <div className={`h-2 w-2 rounded-full ${t.passed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                                    <span className="text-xs font-mono dark:text-[#c9d1d9]">Test Sequence {t.testNumber.toString().padStart(2, '0')}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${t.passed ? 'text-emerald-500' : 'text-red-500'}`}>{t.passed ? 'PASS' : 'FAIL'}</span>
                               </div>
                             ))}
                          </div>
                        </>
                      )}
                     </div>
                  )}
                  {bottomPanelTab === 'hints' && (
                    <div className="animate-in fade-in duration-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {challenge.hints?.map((hint, i) => {
                        const isRevealed = revealedHints.includes(i);
                        return (
                          <div key={i} className={`p-5 rounded-lg border transition-all ${isRevealed ? 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10' : 'border-slate-200 bg-slate-50 dark:border-[#30363d] dark:bg-[#161b22]'}`}>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-[#8b949e] uppercase tracking-widest">Concept {i + 1}</span>
                              {!isRevealed && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500">Cost: {hint.cost} XP</span>}
                            </div>
                            {isRevealed ? (
                              <div className="text-xs font-medium leading-relaxed dark:text-[#c9d1d9] markdown-body prose-sm">
                                 <ReactMarkdown>{hint.text}</ReactMarkdown>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRevealHint(i)}
                                className="w-full py-2.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-md hover:bg-amber-600 transition-all active:scale-[0.98]"
                              >
                                decrypt concept
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {bottomPanelTab === 'solutions' && <div className="animate-in fade-in duration-500 p-6"><CommunitySolutions challengeId={id!} /></div>}
                  {bottomPanelTab === 'official-solution' && (
                     <div className="animate-in fade-in duration-500 h-full p-6">
                       <div className="h-full flex flex-col p-6 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10 overflow-hidden">
                          <h4 className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-3 uppercase tracking-widest">● Reference Implementation</h4>
                          {officialSolutionLoading ? (
                             <div className="flex items-center gap-3 text-xs text-emerald-500 font-bold"><div className="animate-spin h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full" /> ANALYZING...</div>
                          ) : officialSolutionCode ? (
                             <pre className="flex-1 p-5 bg-white dark:bg-[#0d1117] border border-emerald-200 dark:border-[#30363d] rounded-md font-mono text-[12px] leading-relaxed overflow-x-auto whitespace-pre custom-scrollbar dark:text-[#c9d1d9] shadow-inner">{officialSolutionCode}</pre>
                          ) : <p className="text-xs text-emerald-500/60 font-bold uppercase tracking-widest">Reference solution locked.</p>}
                       </div>
                     </div>
                  )}
                  {bottomPanelTab === 'analytics' && analyticsView && (
                     <div className="animate-in fade-in duration-500 p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-5 bg-slate-50 dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-lg">
                           <div className="text-[9px] font-bold text-slate-400 dark:text-[#8b949e] uppercase tracking-widest mb-1">Global Success</div>
                           <div className="text-xl font-bold dark:text-white">{(analyticsView.solveRate * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-5 bg-slate-50 dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-lg">
                           <div className="text-[9px] font-bold text-slate-400 dark:text-[#8b949e] uppercase tracking-widest mb-1">Users Solved</div>
                           <div className="text-xl font-bold dark:text-white">{analyticsView.totalSolved}</div>
                        </div>
                        <div className="p-5 bg-slate-50 dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-lg">
                           <div className="text-[9px] font-bold text-slate-400 dark:text-[#8b949e] uppercase tracking-widest mb-1">Avg Attempts</div>
                           <div className="text-xl font-bold dark:text-white">{analyticsView.avgAttempts.toFixed(1)}</div>
                        </div>
                     </div>
                  )}
                </div>
              </div>
            </Panel>
          </Group>
        </div>

        {/* MOBILE VIEW: App-like Tabbed Experience */}
        <div className="flex flex-col lg:hidden flex-1 overflow-hidden w-full bg-white dark:bg-[#0d1117] relative">
          {/* Mobile Main Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24">
            {mobileTab === 'description' && (
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
                <div className="bg-white dark:bg-[#0d1117] rounded-3xl border border-slate-100 dark:border-white/5 p-6 shadow-sm mb-4">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="space-y-1">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{challenge.title}</h2>
                      <div className="flex items-center gap-2">
                        <DifficultyBadge difficulty={challenge.difficulty} />
                        <span className="text-[10px] font-bold text-amber-500">+{challenge.xpReward} XP</span>
                      </div>
                    </div>
                  </div>
                  <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{challenge.description}</ReactMarkdown>
                  </div>
                  {challenge.constraints?.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Constraints</h3>
                      <ul className="space-y-3">
                        {challenge.constraints.map((c, i) => (
                           <li key={i} className="flex items-start gap-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                             <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-500" />
                             {c}
                           </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 mb-4">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Community Discussion</span>
                      <button onClick={() => setLeftPanelTab('chat')} className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Open Chat</button>
                   </div>
                </div>
              </div>
            )}

            {mobileTab === 'editor' && (
              <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
                <div className="bg-slate-50/50 dark:bg-white/[0.02] p-3 border border-slate-200 dark:border-white/5 rounded-2xl mb-3 flex items-center justify-between">
                   <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-4">
                     {challenge.languages.map(lang => (
                       <button key={lang} onClick={() => handleLangChange(lang)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${selectedLang === lang ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-200/50 dark:bg-white/5 text-slate-500'}`}>{lang}</button>
                     ))}
                   </div>
                </div>
                <div className="flex-1 min-h-[400px] relative rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
                   <Editor
                     key={selectedLang}
                     height="100%"
                     language={MONACO_LANG[selectedLang] || 'javascript'}
                     value={code}
                     onChange={(val) => setCode(val ?? '')}
                     theme={editorTheme}
                     options={{ 
                       fontSize: 13, 
                       minimap: { enabled: false }, 
                       automaticLayout: true, 
                       wordWrap: 'on',
                       padding: { top: 20 },
                       lineNumbers: 'on',
                       glyphMargin: false,
                       folding: false,
                     }}
                   />
                </div>
                <div className="mt-4 flex gap-3">
                   <button onClick={handleRun} disabled={running} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-600 active:scale-95 transition-all">
                     <Play className="h-4 w-4" /> {running ? 'Running...' : 'Run'}
                   </button>
                   <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-4 bg-primary-600 text-white rounded-2xl shadow-xl shadow-primary-500/30 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">
                     <Send className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Submit'}
                   </button>
                </div>
              </div>
            )}

            {mobileTab === 'console' && (
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-6 pb-2 border-b border-slate-100 dark:border-white/5">
                  <button onClick={() => setBottomPanelTab('testcases')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${bottomPanelTab === 'testcases' ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400'}`}>Testcases</button>
                  <button onClick={() => setBottomPanelTab('result')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${bottomPanelTab === 'result' ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400'}`}>Results</button>
                  <button onClick={() => setBottomPanelTab('hints')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${bottomPanelTab === 'hints' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400'}`}>Hints</button>
                  <button onClick={() => setBottomPanelTab('analytics')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${bottomPanelTab === 'analytics' ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400'}`}>Stats</button>
                </div>

                <div className="min-h-[300px]">
                  {bottomPanelTab === 'testcases' && (
                    <div className="space-y-4">
                       <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                         {challenge.examples.map((_, i) => (
                           <button key={i} onClick={() => setSelectedTestCase(i)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 ${selectedTestCase === i ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>Case {i + 1}</button>
                         ))}
                       </div>
                       <pre className="p-4 bg-slate-50/50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl font-mono text-[11px] whitespace-pre-wrap">{challenge.examples[selectedTestCase]?.input}</pre>
                       <pre className="p-4 bg-slate-50/50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl font-mono text-[11px] whitespace-pre-wrap">{challenge.examples[selectedTestCase]?.output}</pre>
                    </div>
                  )}
                  {bottomPanelTab === 'result' && (
                    <div className="space-y-4">
                      {displayResult ? (
                        <>
                          <div className={`p-5 rounded-2xl border ${displayResult.status === 'accepted' ? 'border-primary-200 bg-primary-50/20' : 'border-red-200 bg-red-50/20'}`}>
                             <h4 className="text-[11px] font-black uppercase mb-2">{displayResult.status === 'accepted' ? 'Accepted' : 'Failed'}</h4>
                             <div className="text-xl font-black">{displayResult.passedTests} / {displayResult.totalTests}</div>
                          </div>
                          {displayResult.testResults.map((t, i) => (
                            <div key={i} className={`p-4 rounded-xl border border-slate-100 dark:border-white/5 text-[10px] font-bold flex justify-between ${t.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                               <span>TEST {i + 1}</span>
                               <span className="uppercase tracking-widest">{t.passed ? 'Success' : 'Fail'}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="p-12 text-center opacity-30 flex flex-col items-center gap-2">
                           <Play className="h-10 w-10" />
                           <p className="text-[10px] font-black uppercase tracking-widest">No results yet</p>
                        </div>
                      )}
                    </div>
                  )}
                  {bottomPanelTab === 'hints' && (
                    <div className="space-y-3">
                      {challenge.hints?.map((hint, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-[9px] font-black uppercase text-slate-400">Hint {i + 1}</span>
                              {!revealedHints.includes(i) && <span className="text-[9px] font-black text-amber-600">{hint.cost} XP</span>}
                           </div>
                           {revealedHints.includes(i) ? (
                              <div className="text-xs font-medium leading-relaxed"><ReactMarkdown>{hint.text}</ReactMarkdown></div>
                           ) : (
                              <button onClick={() => handleRevealHint(i)} className="w-full py-2.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Reveal</button>
                           )}
                        </div>
                      ))}
                    </div>
                  )}
                  {bottomPanelTab === 'analytics' && analyticsView && (
                    <div className="grid grid-cols-2 gap-3 pb-4">
                       <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
                          <div className="text-[8px] font-black uppercase text-slate-400 mb-1">Global Scale</div>
                          <div className="text-lg font-black">{(analyticsView.solveRate * 100).toFixed(1)}%</div>
                       </div>
                       <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
                          <div className="text-[8px] font-black uppercase text-slate-400 mb-1">Solvers</div>
                          <div className="text-lg font-black">{analyticsView.totalSolved}</div>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[72px] bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 flex items-center justify-around px-4 z-50">
             <button onClick={() => setMobileTab('description')} className={`flex flex-col items-center gap-1 transition-all ${mobileTab === 'description' ? 'text-primary-500' : 'text-slate-400'}`}>
                <AlignLeft className="h-5 w-5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Statement</span>
             </button>
             <button onClick={() => setMobileTab('editor')} className={`flex flex-col items-center gap-1 transition-all ${mobileTab === 'editor' ? 'text-primary-500' : 'text-slate-400'}`}>
                <Code2 className="h-5 w-5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Code</span>
             </button>
             <button onClick={() => setMobileTab('console')} className={`flex flex-col items-center gap-1 transition-all ${mobileTab === 'console' ? 'text-primary-500' : 'text-slate-400'}`}>
                <Target className="h-5 w-5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Console</span>
             </button>
          </div>
        </div>
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
      <Modal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Battle Status"
        description="Share your feedback on this battle."
        className="max-w-lg"
      >
        <SiteRatingWidget compact className="max-w-none" />
      </Modal>
    </>
  );
};

export default ChallengeDetail;
