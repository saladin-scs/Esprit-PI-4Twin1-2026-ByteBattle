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
import { Play, Send, Keyboard, AlignLeft, Lightbulb, MessageCircle, Sparkles, Copy, Check } from 'lucide-react';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { challengesApi } from '../../services/api';
import { DifficultyBadge } from '../../components/Challenges';
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

const DISPLAY_LANGUAGE: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
};

const HINT_TIER_LABEL: Record<string, string> = {
  basic: 'Light hint',
  detailed: 'Detailed hint',
  premium: 'Advanced hint',
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
  officialSolution?: Record<string, string>;
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
    /** Submission hidden case: input/output not exposed (server anti-cheat). */
    isHiddenCase?: boolean;
    message?: string;
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
    error: storeError,
    setChallenge,
    setSelectedLang,
    setCode,
    setCompletedLanguages,
    setLoadingChallenge,
    setError: setStoreError,
    reset: resetStore,
  } = useChallengeDetailStore();
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState<
    'description' | 'hints' | 'result' | 'solutions' | 'correction' | 'chat' | 'coach'
  >('description');
  const isAuthed = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isAdmin = useSelector((s: RootState) => Boolean(s.auth.user?.roles?.includes('admin')));
  const [isVimMode, setIsVimMode] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const [officialSolution, setOfficialSolution] = useState<Record<string, string>>({});
  const [officialSolutionCode, setOfficialSolutionCode] = useState<string | null>(null);
  const [officialSolutionLoading, setOfficialSolutionLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalPayload, setSuccessModalPayload] = useState<{
    xpEarned: number;
    badgesUnlocked: string[];
    rankProgress: RankProgress | null;
    totalXp: number;
    rankTier: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [testCount, setTestCount] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
  const [showHistoryAfterAttempts, setShowHistoryAfterAttempts] = useState(false);
  const [expandedHistoryItem, setExpandedHistoryItem] = useState<string | null>(null);

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
      setActiveTab('description');
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
        const [publicRes, adminRes] = await Promise.all([
          challengesApi.getOne(id),
          isAdmin ? challengesApi.getOneAdmin(id).catch(() => null) : Promise.resolve(null),
        ]);
        const data = publicRes.data as Challenge;
        const adminData = adminRes?.data as Challenge | undefined;
        setChallenge(data as import('../../stores/challengeDetailStore').ChallengeDetailChallenge);
        setOfficialSolution(adminData?.officialSolution || {});
        const langs = data.languages ?? [];
        const preferred = langFromUrl && langs.includes(langFromUrl) ? langFromUrl : langs[0] || 'javascript';
        if (!langFromUrl && preferred) {
          setSearchParams({ lang: preferred }, { replace: true });
        }
        setSelectedLang(preferred);
        setCode(data.starterCode?.[preferred] || '');
      } catch {
        setStoreError('Challenge not found.');
        setOfficialSolution({});
      } finally {
        setLoadingChallenge(false);
      }
    };
    run();
  }, [id, isAdmin, langFromUrl, resetStore, setChallenge, setSelectedLang, setCode, setLoadingChallenge, setSearchParams, setStoreError]);

  useEffect(() => {
    if (!id) return;
    challengesApi
      .getMyCompletion(id)
      .then((res) => {
        const list = (res.data as { completedLanguages: string[] }).completedLanguages ?? [];
        setCompletedLanguages(list);
        setIsSolved(list.length > 0);
      })
      .catch(() => {
        setCompletedLanguages([]);
        setIsSolved(false);
      })
      .finally(() => undefined);

    // Also fetch history to count total attempts
    challengesApi.getMyHistory(id)
      .then(res => {
        const history = res.data as any[];
        setTestCount(history.length);
        setSubmissionHistory(history);
        // Show history after 5 attempts
        if (history.length >= 5) {
          setShowHistoryAfterAttempts(true);
        }
      })
      .catch(() => setTestCount(0));
  }, [id, setCompletedLanguages]);

  useEffect(() => {
    if (!id || !isSolved || !selectedLang) return;
    loadOfficialSolution(selectedLang);
  }, [id, isSolved, selectedLang]);

  // Sync URL lang → store (and code) when challenge is loaded so code always matches selected language
  useEffect(() => {
    if (!challenge || !langFromUrl || !challenge.languages?.includes(langFromUrl)) return;
    setSelectedLang(langFromUrl);
    const starter = challenge.starterCode?.[langFromUrl];
    if (starter != null) setCode(starter);
  }, [langFromUrl, challenge, setSelectedLang, setCode]);

  const cleanSolutionCode = (rawCode: string, lang: string) => {
    let cleanedCode = rawCode.replace(/^```[a-z]*\s*\n/i, '').replace(/\n```\s*$/i, '').trim();

    if (lang === 'javascript' && !cleanedCode.includes('console.log')) {
      const funcMatch = cleanedCode.match(/function\s+([a-zA-Z0-9_]+)/) || cleanedCode.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:function|\()/);
      if (funcMatch) {
        cleanedCode += `\n\n// Added by system to ensure correct I/O\nconst input = readline().trim();\nconsole.log(${funcMatch[1]}(input));`;
      }
    } else if (lang === 'python' && !cleanedCode.includes('print')) {
      const funcMatch = cleanedCode.match(/def\s+([a-zA-Z0-9_]+)/);
      if (funcMatch) {
        cleanedCode += `\n\n# Added by system to ensure correct I/O\nimport sys\ninput_data = sys.stdin.read().strip()\nif input_data:\n    print(${funcMatch[1]}(input_data))`;
      }
    }

    return cleanedCode;
  };

  const loadOfficialSolution = async (lang: string) => {
    if (!id) return;
    setOfficialSolutionLoading(true);
    try {
      const res = await challengesApi.getOfficialSolution(id, { language: lang });
      const payload = res.data as { code?: string; solutions?: Array<{ language: string; code: string }> };
      const code = payload.code || payload.solutions?.find((s) => s.language === lang)?.code || '';
      if (code) {
        setOfficialSolutionCode(cleanSolutionCode(code, lang));
      }
    } catch {
      setOfficialSolutionCode(null);
    } finally {
      setOfficialSolutionLoading(false);
    }
  };

  const handleLangChange = (lang: string) => {
    setSearchParams({ lang });
    setSelectedLang(lang);
    setCode(challenge?.starterCode?.[lang] || '');
  };

  const handleRun = async () => {
    if (!id) return;

    // Logic: Exactly on the 5th attempt, it auto-submits.
    if (testCount === 4 && !isSolved) {
      const confirmSubmit = window.confirm(
        "You have reached 5 test runs. This attempt will now be automatically submitted for evaluation. Continue?"
      );
      if (confirmSubmit) {
        return handleSubmit();
      }
      return;
    }

    setRunning(true);
    setSubmitError(null);
    setRunResult(null);
    try {
      const res = await challengesApi.run(id, { code, language: selectedLang });
      setRunResult(res.data as RunResult);
      setTestCount(prev => prev + 1);
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
      setTestCount(prev => prev + 1);
      setActiveTab('result');
      if (data.status === 'accepted') {
        setIsSolved(true);
        await loadOfficialSolution(selectedLang);
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
      // Refresh history after submission
      try {
        const historyRes = await challengesApi.getMyHistory(id);
        const history = historyRes.data as any[];
        setSubmissionHistory(history);
        if (history.length >= 5) {
          setShowHistoryAfterAttempts(true);
        }
      } catch {
        // Ignore history refresh error
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
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 font-sans dark:bg-[#010409]">
        <Group {...({ direction: 'horizontal' } as any)}>
          <Panel defaultSize={38} minSize={28}>
            <div className="flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-[#30363d] dark:bg-[#0d1117]">
              <div role="tablist" aria-label="Challenge sections" className="flex shrink-0 border-b border-slate-200 dark:border-[#30363d]">
                <button
                  role="tab"
                  aria-selected={activeTab === 'description'}
                  type="button"
                  onClick={() => setActiveTab('description')}
                  className={`border-b-2 px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'description'
                      ? 'border-primary-500 text-primary-600 dark:border-[#1f6feb] dark:text-[#58a6ff]'
                      : 'border-transparent text-slate-700 hover:text-slate-950 dark:text-[#8b949e] dark:hover:text-[#c9d1d9]'
                    }`}
                >
                  Description
                </button>
                {challenge.hints && challenge.hints.length > 0 && (
                  <button
                    role="tab"
                    aria-selected={activeTab === 'hints'}
                    type="button"
                    onClick={() => setActiveTab('hints')}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'hints'
                        ? 'border-amber-500 text-amber-700 dark:border-amber-400 dark:text-amber-300'
                        : 'border-transparent text-slate-700 hover:text-amber-800 dark:text-[#8b949e] dark:hover:text-amber-200/90'
                      }`}
                    aria-label="Hints and help"
                  >
                    <Lightbulb className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
                    Hints
                  </button>
                )}
                {(displayResult?.status === 'accepted' || (completedLanguages?.length ?? 0) > 0) && (
                  <button
                    role="tab"
                    aria-selected={activeTab === 'solutions'}
                    type="button"
                    onClick={() => setActiveTab('solutions')}
                    className={`border-b-2 px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'solutions'
                        ? 'border-primary-500 text-primary-600 dark:border-[#1f6feb] dark:text-[#58a6ff]'
                        : 'border-transparent text-slate-700 hover:text-slate-950 dark:text-[#8b949e] dark:hover:text-[#c9d1d9]'
                      }`}
                  >
                    Solutions
                  </button>
                )}
                {isAdmin && Boolean(officialSolution?.[selectedLang]) && (
                  <button
                    role="tab"
                    aria-selected={activeTab === 'correction'}
                    type="button"
                    onClick={() => setActiveTab('correction')}
                    className={`border-b-2 px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'correction'
                        ? 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-300'
                        : 'border-transparent text-slate-700 hover:text-slate-950 dark:text-[#8b949e] dark:hover:text-[#c9d1d9]'
                      }`}
                  >
                    Correction
                  </button>
                )}
                {(displayResult || submitError) && (
                  <button
                    role="tab"
                    aria-selected={activeTab === 'result'}

                    type="button"
                    onClick={() => setActiveTab('result')}
                    className={`border-b-2 px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'result'
                        ? 'border-primary-500 text-primary-600 dark:border-[#1f6feb] dark:text-[#58a6ff]'
                        : 'border-transparent text-slate-700 dark:text-[#8b949e]'
                      }`}
                  >
                    Result {displayResult?.status === 'accepted' ? '✅' : displayResult ? '❌' : '⚠️'}
                  </button>
                )}
                {isAuthed && (
                  <>
                    <button
                      role="tab"
                      aria-selected={activeTab === 'chat'}
                      type="button"
                      onClick={() => setActiveTab('chat')}
                      className={`inline-flex items-center gap-1.5 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'chat'
                          ? 'border-primary-500 text-primary-600 dark:border-[#1f6feb] dark:text-[#58a6ff]'
                          : 'border-transparent text-slate-700 hover:text-slate-950 dark:text-[#8b949e] dark:hover:text-[#c9d1d9]'
                        }`}
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      Chat
                    </button>
                    <button
                      role="tab"
                      aria-selected={activeTab === 'coach'}
                      type="button"
                      onClick={() => setActiveTab('coach')}
                      className={`inline-flex items-center gap-1.5 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'coach'
                          ? 'border-primary-500 text-primary-600 dark:border-[#1f6feb] dark:text-[#58a6ff]'
                          : 'border-transparent text-slate-700 hover:text-slate-950 dark:text-[#8b949e] dark:hover:text-[#c9d1d9]'
                        }`}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden />
                      AI coach
                    </button>
                  </>
                )}
              </div>

              {isAuthed && activeTab !== 'chat' && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-500/25 bg-emerald-500/5 px-4 py-2.5 text-xs text-emerald-900 dark:border-emerald-500/20 dark:bg-[#0c1412] dark:text-emerald-100/95">
                  <span>
                    <span className="font-semibold">Live chat</span> - discuss this challenge with others.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 dark:bg-[#238636] dark:hover:bg-[#2ea043]"
                  >
                    Open chat
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5">
                {activeTab === 'description' && (
                  <>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-[#f0f6fc]">{challenge.title}</h2>
                      <DifficultyBadge difficulty={challenge.difficulty} />
                      <span className="ml-auto font-semibold text-amber-600 dark:text-[#e3b341]">+{challenge.xpReward} XP</span>
                    </div>
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {challenge.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border border-primary-500/20 bg-primary-500/10 px-2 py-0.5 text-xs text-primary-800 dark:border-[#30363d] dark:bg-[#161b22] dark:text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    {challenge.hints && challenge.hints.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('hints')}
                        className="mb-5 flex w-full items-start gap-3 rounded-xl border border-amber-400/35 bg-gradient-to-br from-amber-500/12 via-amber-500/5 to-transparent p-4 text-left transition hover:border-amber-400/55 hover:from-amber-500/18 dark:border-amber-500/25 dark:from-amber-500/15 dark:via-amber-500/5 dark:hover:border-amber-400/35"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.25)] dark:bg-amber-500/20 dark:shadow-[0_0_24px_rgba(251,191,36,0.2)]">
                          <Lightbulb className="h-6 w-6 text-amber-600 dark:text-amber-300" strokeWidth={2} aria-hidden />
                        </span>
                        <span className="min-w-0 pt-0.5">
                          <span className="block text-sm font-semibold text-amber-950 dark:text-amber-100">
                            Need a hint?
                          </span>
                          <span className="mt-0.5 block text-sm text-amber-950 dark:text-amber-200/80">
                            {challenge.hints.length} hint{challenge.hints.length > 1 ? 's' : ''} available - open the{' '}
                            <strong className="font-semibold">Hints</strong> tab (lightbulb icon).
                          </span>
                        </span>
                      </button>
                    ) : (
                      <div className="mb-5 flex items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-[#30363d] dark:bg-[#161b22]">
                        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500/80 dark:text-amber-400/90" aria-hidden />
                        <p className="text-sm leading-relaxed text-slate-800 dark:text-[#8b949e]">
                          <span className="font-semibold text-slate-900 dark:text-[#c9d1d9]">Quick reminder:</span>{' '}
                          read the statement and examples carefully, use <strong>Run</strong> on visible tests, then{' '}
                          <strong>Submit</strong> when ready.
                        </p>
                      </div>
                    )}
                    <div className="markdown-body prose prose-slate prose-sm mb-6 max-w-none text-gray-800 prose-headings:text-gray-900 dark:prose-invert dark:text-[#c9d1d9]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>
                        {challenge.description}
                      </ReactMarkdown>
                    </div>
                    {challenge.examples?.length > 0 && (
                      <>
                        <h3 className="mt-6 mb-2 text-sm font-semibold text-gray-900 dark:text-[#f0f6fc]">Examples</h3>
                        {challenge.examples.map((ex, i) => (
                          <div
                            key={i}
                            className="mb-3 rounded-lg border border-slate-200 bg-gray-50 p-3 text-sm dark:border-[#30363d] dark:bg-[#161b22]"
                          >
                            <div>
                              <strong className="text-gray-900 dark:text-[#c9d1d9]">Input:</strong>{' '}
                              <code className="rounded-md bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-900 dark:bg-[#0d1117] dark:text-[#79c0ff]">
                                {ex.input}
                              </code>
                            </div>
                            <div className="mt-2">
                              <strong className="text-gray-900 dark:text-[#c9d1d9]">Output:</strong>{' '}
                              <code className="rounded-md bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-900 dark:bg-[#0d1117] dark:text-[#79c0ff]">
                                {ex.output}
                              </code>
                            </div>
                            {ex.explanation && (
                              <div className="mt-2 text-gray-600 dark:text-[#8b949e]">
                                <strong>Explanation:</strong> {ex.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    {challenge.constraints?.length > 0 && (
                      <>
                        <h3 className="mt-6 mb-2 text-sm font-semibold text-gray-900 dark:text-[#f0f6fc]">Constraints</h3>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-[#c9d1d9]">
                          {challenge.constraints.map((c, i) => (
                            <li key={i}><code className="px-1 rounded bg-gray-200 dark:bg-gray-600 text-xs">{c}</code></li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}

                {activeTab === 'hints' && challenge.hints && challenge.hints.length > 0 && (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-5 dark:border-amber-500/20 dark:from-amber-500/12 dark:via-transparent">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/25 shadow-[0_0_28px_rgba(245,158,11,0.2)] dark:bg-amber-500/15 dark:shadow-[0_0_32px_rgba(251,191,36,0.15)]">
                          <Lightbulb className="h-8 w-8 text-amber-600 dark:text-amber-300" strokeWidth={1.75} aria-hidden />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-amber-950 dark:text-amber-50">Indices</h2>
                          <p className="mt-1 text-sm text-amber-900/85 dark:text-amber-100/75">
                            Reveal hints one by one. They guide you without giving away the full solution.
                          </p>
                        </div>
                      </div>
                    </div>
                    {challenge.hints.map((hint, i) => {
                      const isRevealed = revealedHints.includes(i);
                      const tierLabel = HINT_TIER_LABEL[hint.tier] ?? hint.tier;
                      return (
                        <div
                          key={i}
                          className={`rounded-xl border p-4 text-sm transition ${isRevealed
                              ? 'border-amber-400/45 bg-amber-50/90 text-amber-950 dark:border-amber-500/30 dark:bg-[#1c1917] dark:text-amber-50'
                              : 'border-slate-200 bg-slate-50/80 dark:border-[#30363d] dark:bg-[#161b22]'
                            }`}
                        >
                          {isRevealed ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                                  <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                                  Hint {i + 1} · {tierLabel}
                                </span>
                                {hint.cost > 0 && (
                                  <span className="text-xs text-amber-800/70 dark:text-amber-200/60">
                                    Cost: {hint.cost} XP
                                  </span>
                                )}
                              </div>
                              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                  {hint.text}
                                </ReactMarkdown>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-start gap-2">
                                <Lightbulb
                                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-500/70 dark:text-amber-400/60"
                                  aria-hidden
                                />
                                <div>
                                  <p className="font-medium text-slate-800 dark:text-[#c9d1d9]">Hint {i + 1}</p>
                                  <p className="text-sm text-slate-700 dark:text-[#8b949e]">
                                    {tierLabel}
                                    {hint.cost > 0 ? ` · ${hint.cost} XP` : ''} - hidden for now.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (hint.cost > 0) {
                                    const confirmed = window.confirm(`This hint costs ${hint.cost} XP. Are you sure you want to reveal it?`);
                                    if (!confirmed) return;
                                  }
                                  setRevealedHints([...revealedHints, i]);
                                }}
                                className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-amber-950 shadow-sm hover:bg-amber-400 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-500"
                              >
                                Show hint
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                          className={`rounded-lg p-4 ${displayResult.status === 'accepted'
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
                        {displayResult.status === 'accepted' && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-[#30363d] dark:bg-[#0d1117]">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">✅ Solution officielle</div>
                            <p className="mt-2 text-slate-700 dark:text-slate-300">
                              Voici la solution correcte pour {DISPLAY_LANGUAGE[selectedLang] ?? selectedLang}.
                            </p>
                            {officialSolutionLoading ? (
                              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Chargement de la solution...</p>
                            ) : officialSolutionCode ? (
                              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md bg-black/5 p-3 text-xs text-slate-900 dark:bg-white/5 dark:text-slate-100">
                                {officialSolutionCode}
                              </pre>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                                Aucune solution officielle disponible pour ce langage.
                              </p>
                            )}
                          </div>
                        )}
                        {/* Hint: empty output on all failed tests → user forgot I/O */}
                        {displayResult.status !== 'accepted' &&
                          displayResult.testResults.filter((t) => !t.passed && !t.isHiddenCase).length > 0 &&
                          displayResult.testResults
                            .filter((t) => !t.passed && !t.isHiddenCase)
                            .every((t) => !t.actualOutput || t.actualOutput.trim() === '') && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-100">
                              <div className="font-semibold mb-1">💡 Votre code ne produit aucune sortie</div>
                              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200/80">
                                Votre fonction est peut-être correcte, mais le système attend une sortie via <code className="rounded bg-amber-500/20 px-1 font-mono">console.log()</code>.
                                Assurez-vous de <strong>lire l'entrée</strong> avec <code className="rounded bg-amber-500/20 px-1 font-mono">readline()</code> et d'<strong>afficher le résultat</strong> avec <code className="rounded bg-amber-500/20 px-1 font-mono">console.log()</code>.
                              </p>
                              <div className="mt-2 rounded bg-black/10 dark:bg-black/30 p-2 font-mono text-xs">
                                <span className="text-amber-700 dark:text-amber-300">// Exemple :</span><br />
                                const input = readline().trim();<br />
                                console.log(votreFunction(input));
                              </div>
                            </div>
                          )}
                        {displayResult.testResults.map((t) => (
                          <div
                            key={t.testNumber}
                            className={`p-3 rounded-lg border text-sm ${t.passed
                                ? 'border border-primary-500/25 bg-primary-500/5 dark:bg-primary-500/10'
                                : 'border border-red-500/25 bg-red-500/5 dark:bg-red-500/10'
                              }`}
                          >
                            <div className={`font-medium ${t.passed ? 'text-primary-800 dark:text-primary-300' : 'text-red-700 dark:text-red-300'}`}>
                              {t.passed ? '✅' : '❌'} Test #{t.testNumber}
                            </div>
                            {!t.passed && (
                              <div className="mt-2 space-y-1 text-xs">
                                {t.isHiddenCase || (testCount > 5 && !isSolved && !isAdmin) ? (
                                  <p className="rounded-md border border-amber-500/25 bg-amber-500/5 px-2 py-1.5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100/90">
                                    🔒 {t.isHiddenCase ? (t.message || 'Hidden test case - details are not shown to prevent cheating.') : 'Submission limit exceeded - details are hidden for practice mode. Solve it to see full results!'}
                                  </p>
                                ) : (
                                  <>
                                    {t.input != null && (
                                      <div>
                                        <strong>Input:</strong> <code className="ml-1">{t.input}</code>
                                      </div>
                                    )}
                                    {t.expectedOutput != null && (
                                      <div>
                                        <strong>Expected:</strong> <code className="ml-1">{t.expectedOutput}</code>
                                      </div>
                                    )}
                                    {t.actualOutput != null && (
                                      <div>
                                        <strong>Got:</strong> <code className="ml-1">{t.actualOutput}</code>
                                      </div>
                                    )}
                                    {t.error && (
                                      <div className="text-red-600 dark:text-red-400">
                                        <strong>Error:</strong> {t.error}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    {showHistoryAfterAttempts && submissionHistory.length > 0 && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-[#30363d] dark:bg-[#0d1117]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 mb-3">📋 Historique des tentatives</div>
                        <div className="space-y-3">
                          {submissionHistory.slice(0, 5).map((sub, i) => {
                            const isExpanded = expandedHistoryItem === sub._id;
                            return (
                              <div key={sub._id} className="rounded-lg border border-slate-200 bg-white dark:border-[#30363d] dark:bg-[#161b22] overflow-hidden">
                                <div
                                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#21262d]"
                                  onClick={() => setExpandedHistoryItem(isExpanded ? null : sub._id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">#{i + 1}</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                      sub.status === 'accepted'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    }`}>
                                      {sub.status === 'accepted' ? '✅ Accepté' : '❌ Échec'}
                                    </span>
                                    <span className="text-xs text-slate-600 dark:text-slate-400">
                                      {new Date(sub.createdAt).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {sub.language}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {sub.executionTimeMs}ms
                                    </span>
                                    <span className={`text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                      ▼
                                    </span>
                                  </div>
                                </div>
                                {isExpanded && (
                                  <div className="border-t border-slate-200 dark:border-[#30363d] p-3">
                                    <div className="mb-2">
                                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Code soumis :</span>
                                    </div>
                                    <pre className="bg-slate-100 dark:bg-[#0d1117] p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono text-slate-900 dark:text-slate-100 max-h-60 overflow-y-auto">
                                      {sub.code}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'solutions' && (
                  <div className="h-full min-h-0">
                    <CommunitySolutions challengeId={id!} />
                  </div>
                )}

                {activeTab === 'correction' && isAdmin && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                      <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
                        Correction officielle
                      </h2>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                        <p className="text-sm text-emerald-800/80 dark:text-emerald-100/70">
                          Solution admin pour {DISPLAY_LANGUAGE[selectedLang] ?? selectedLang}.
                        </p>
                        {officialSolution?.[selectedLang] && (
                          <button
                            type="button"
                            onClick={() => {
                              const rawCode = officialSolution[selectedLang];
                              let cleanedCode = rawCode.replace(/^```[a-z]*\s*\n/i, '').replace(/\n```\s*$/i, '').trim();
                              
                              if (selectedLang === 'javascript' && !cleanedCode.includes('console.log')) {
                                const funcMatch = cleanedCode.match(/function\s+([a-zA-Z0-9_]+)/) || cleanedCode.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:function|\()/);
                                if (funcMatch) {
                                  cleanedCode += `\n\n// Added by system to fix older solutions\nconst input = readline().trim();\nconsole.log(${funcMatch[1]}(input));`;
                                }
                              } else if (selectedLang === 'python' && !cleanedCode.includes('print')) {
                                const funcMatch = cleanedCode.match(/def\s+([a-zA-Z0-9_]+)/);
                                if (funcMatch) {
                                  cleanedCode += `\n\n# Added by system to fix older solutions\nimport sys\ninput_data = sys.stdin.read().strip()\nif input_data:\n    print(${funcMatch[1]}(input_data))`;
                                }
                              }

                              setCode(cleanedCode);
                              toast.success('Correction insérée !');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-[#238636] dark:hover:bg-[#2ea043]"
                          >
                            <Copy className="h-4 w-4" />
                            Insérer le code
                          </button>
                        )}
                      </div>
                    </div>
                    {officialSolution?.[selectedLang] ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#30363d] dark:bg-[#0d1117]">
                        <Editor
                          height="360px"
                          language={MONACO_LANG[selectedLang] || 'javascript'}
                          value={officialSolution[selectedLang]}
                          theme={editorTheme}
                          options={{
                            readOnly: true,
                            fontSize: 14,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            automaticLayout: true,
                            padding: { top: 16 },
                          }}
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#8b949e]">
                        Aucune correction enregistree pour ce langage.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'chat' && isAuthed && id && (
                  <CollaborationChat
                    room={`challenge:${id}`}
                    title="Challenge chat"
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
                      (() => {
                        const f = displayResult?.testResults?.find((t) => !t.passed);
                        return f?.error ?? f?.message;
                      })() ??
                      undefined
                    }
                    runtimeMs={displayResult?.executionTimeMs ?? runResult?.executionTimeMs}
                  />
                )}
              </div>
            </div>
          </Panel>

          <Separator className="w-2 cursor-col-resize bg-gray-200 transition-colors hover:bg-primary-500/30 dark:bg-[#30363d]" />
          <Panel minSize={32}>
            <Group {...({ direction: 'vertical' } as any)}>
              <Panel defaultSize={68} minSize={22}>
                <div className="flex h-full flex-col bg-white dark:bg-[#0d1117]">
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-[#30363d] dark:bg-[#161b22]">
                    <div className="flex flex-wrap items-center gap-2">
                      {challenge.languages.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleLangChange(lang)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${selectedLang === lang
                              ? 'bg-primary-600 text-white dark:bg-[#1f6feb] dark:text-white'
                              : 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-[#21262d] dark:text-[#c9d1d9] dark:hover:bg-[#30363d]'
                            }`}
                        >
                          {DISPLAY_LANGUAGE[lang] ?? lang}
                          {completedLanguages.includes(lang) && ' ✓'}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSearchParams({})}
                        className="rounded px-3 py-1.5 text-xs font-medium text-slate-800 hover:text-slate-950 dark:text-gray-400 dark:hover:text-gray-100"
                        title="Change language"
                      >
                        Change language
                      </button>
                      <div className="h-5 w-px bg-slate-300 dark:bg-[#30363d]" />
                      <button
                        type="button"
                        title="Vim mode"
                        className={`rounded p-1.5 ${isVimMode ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 hover:text-slate-950 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        onClick={() => setIsVimMode(!isVimMode)}
                      >
                        <Keyboard className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Format"
                        className="rounded p-1.5 text-slate-700 hover:text-slate-950 dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRun}
                        disabled={running || !challenge.examples?.length}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          testCount >= 5 && !isSolved
                            ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 animate-pulse'
                            : 'bg-slate-600 hover:bg-slate-700 dark:border dark:border-[#30363d] dark:bg-[#21262d] dark:text-[#c9d1d9] dark:hover:bg-[#30363d]'
                        }`}
                      >
                        <Play className="h-4 w-4" />
                        {running ? 'Running...' : testCount >= 5 ? 'Run (Practice)' : `Run (${5 - testCount} left)`}
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#238636] dark:hover:bg-[#2ea043]"
                      >
                        <Send className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Submit'}
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
                        accessibilitySupport: 'on',
                        tabSize: 2,
                        wordWrap: 'on',
                        automaticLayout: true,
                        padding: { top: 16 },
                      }}
                    />
                    {/* Copy Button Overlay */}
                    <div className="absolute right-6 top-4 z-10">
                      <CopyButton code={code} />
                    </div>
                    <div id="vim-status-node" className={`flex h-6 items-center bg-primary-600 px-2 font-mono text-xs text-white ${isVimMode ? '' : 'hidden'}`} />
                  </div>
                </div>
              </Panel>

              <Separator className="h-1.5 cursor-row-resize bg-slate-200 hover:bg-primary-500/30 dark:bg-[#30363d]" />

              <Panel defaultSize={32} minSize={10}>
                <div className="flex h-full flex-col bg-slate-50 text-slate-800 dark:bg-[#0d1117] dark:text-[#c9d1d9]">
                  <div className="border-b border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#f0f6fc]">
                    Test cases
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 text-sm">
                    {challenge.examples?.length > 0 ? (
                      <>
                        <div className="mb-4 flex flex-wrap gap-2">
                          {challenge.examples.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedTestCase(i)}
                              className={`rounded-lg px-4 py-2 text-sm font-medium ${selectedTestCase === i
                                  ? 'bg-primary-600 text-white dark:bg-[#1f6feb] dark:text-white'
                                  : 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-[#21262d] dark:text-[#c9d1d9] dark:hover:bg-[#30363d]'
                                }`}
                            >
                              Case {i + 1}
                            </button>
                          ))}
                        </div>
                        {challenge.examples[selectedTestCase] && (
                          <div className="space-y-4">
                            <div>
                              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-[#8b949e]">
                                Input
                              </div>
                              <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9]">
                                {challenge.examples[selectedTestCase].input}
                              </pre>
                            </div>

                            <div>
                              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-[#8b949e]">
                                Expected output
                              </div>
                              <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#c9d1d9]">
                                {challenge.examples[selectedTestCase].output}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-700 dark:text-[#8b949e]">No examples. Run or submit to see results.</p>
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

/* ── Sub-components ── */

const CopyButton = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-500 backdrop-blur-sm transition-all hover:bg-white hover:text-slate-900 dark:border-[#30363d] dark:bg-[#161b22]/80 dark:text-[#8b949e] dark:hover:bg-[#161b22] dark:hover:text-[#c9d1d9]"
      title="Copy code"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
};

export default ChallengeDetail;

