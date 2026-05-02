import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { challengesApi, competitionsApi } from '../../services/api';
import { Clock, Trophy, Code2, CheckCircle2, ChevronRight, History as HistoryIcon, Swords, AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

/* ───── Types ───── */
interface SubmissionRow {
  _id: string;
  challengeId: { _id: string; title: string; difficulty: string } | string;
  language: string;
  code: string;
  status: string;
  passedTests: number;
  totalTests: number;
  xpEarned: number;
  executionTimeMs: number;
  createdAt: string;
}

interface CompetitionRow {
  _id: string;
  name: string;
  status: string;
  type?: string;
  startTime?: string;
  endTime?: string;
}

/* ───── Helpers ───── */
const STATUS_STYLE: Record<string, string> = {
  accepted: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  wrong_answer: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  runtime_error: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  time_limit: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  pending: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30',
};

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  runtime_error: 'Runtime Error',
  time_limit: 'Time Limit',
  pending: 'Pending',
};

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: 'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  hard: 'text-red-600 dark:text-red-400',
  expert: 'text-purple-600 dark:text-purple-400',
};

const COMP_STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  scheduled: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  closed: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30',
  archived: 'bg-gray-500/15 text-gray-500 dark:text-gray-500 border-gray-500/30',
};

const LANG_DISPLAY: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

type TabType = 'challenges' | 'competitions';

/* ───── Main Component ───── */
function History() {
  const [activeTab, setActiveTab] = useState<TabType>('challenges');
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [subsError, setSubsError] = useState<string | null>(null);

  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [loadingComps, setLoadingComps] = useState(true);
  const [compsError, setCompsError] = useState<string | null>(null);

  /* Fetch challenge submissions */
  useEffect(() => {
    setLoadingSubs(true);
    setSubsError(null);
    challengesApi
      .getMySubmissions()
      .then((res) => {
        const data = res.data;
        setSubmissions(Array.isArray(data) ? data : []);
      })
      .catch(() => setSubsError('Failed to load submission history.'))
      .finally(() => setLoadingSubs(false));
  }, []);

  /* Fetch competitions history */
  useEffect(() => {
    setLoadingComps(true);
    setCompsError(null);
    competitionsApi
      .getHistory()
      .then((res) => {
        const data = res.data;
        const list = Array.isArray(data) ? data : (data as any)?.competitions ?? (data as any)?.items ?? [];
        setCompetitions(list);
      })
      .catch(() => setCompsError('Failed to load competitions history.'))
      .finally(() => setLoadingComps(false));
  }, []);

  /* Group submissions by challenge */
  const groupedSubmissions = useMemo(() => {
    const groups: Record<string, {
      challenge: { _id: string; title: string; difficulty: string };
      submissions: SubmissionRow[];
    }> = {};

    submissions.forEach((sub) => {
      const ch = typeof sub.challengeId === 'object' ? sub.challengeId : null;
      if (!ch) return;
      const id = ch._id;
      if (!groups[id]) {
        groups[id] = { challenge: ch, submissions: [] };
      }
      groups[id].submissions.push(sub);
    });

    return Object.values(groups).sort((a, b) => {
      // Sort by the most recent submission in each group
      const latestA = new Date(a.submissions[0].createdAt).getTime();
      const latestB = new Date(b.submissions[0].createdAt).getTime();
      return latestB - latestA;
    });
  }, [submissions]);

  /* Stats */
  const totalSubs = submissions.length;
  const accepted = submissions.filter((s) => s.status === 'accepted').length;
  const uniqueChallenges = groupedSubmissions.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-[#0d1117] dark:via-[#010409] dark:to-[#0d1117]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ──── Header ──── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <HistoryIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">History</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-[52px]">
            Review your challenge attempts and competitions.
          </p>
        </div>

        {/* ──── Stats cards ──── */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Attempts</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalSubs}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Accepted</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{accepted}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Unique Challenges</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{uniqueChallenges}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Competitions</p>
            <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">{competitions.length}</p>
          </div>
        </div>

        {/* ──── Tabs ──── */}
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
          <button
            type="button"
            onClick={() => setActiveTab('challenges')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'challenges'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-[#21262d]'
            }`}
          >
            <Code2 className="h-4 w-4" />
            Challenges ({totalSubs})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('competitions')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'competitions'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-[#21262d]'
            }`}
          >
            <Swords className="h-4 w-4" />
            Competitions ({competitions.length})
          </button>
        </div>

        {/* ──── Unlimited note ──── */}
        {activeTab === 'challenges' && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Attempts are <strong>unlimited</strong> - every submission is recorded here.</span>
          </div>
        )}

        {/* ──── Challenge Submissions List ──── */}
        {activeTab === 'challenges' && (
          <div className="space-y-3">
            {loadingSubs && (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            )}
            {subsError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {subsError}
              </div>
            )}
            {!loadingSubs && !subsError && submissions.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-[#30363d] dark:bg-[#161b22]">
                <Code2 className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-gray-500" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">No submissions yet.</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                  Start by solving a{' '}
                  <Link to="/challenges" className="text-indigo-500 hover:underline">
                    challenge
                  </Link>
                  .
                </p>
              </div>
            )}
            {!loadingSubs &&
              groupedSubmissions.map((group) => (
                <ChallengeCard key={group.challenge._id} group={group} />
              ))}
          </div>
        )}

        {/* ──── Competitions List ──── */}
        {activeTab === 'competitions' && (
          <div className="space-y-3">
            {loadingComps && (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            )}
            {compsError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {compsError}
              </div>
            )}
            {!loadingComps && !compsError && competitions.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-[#30363d] dark:bg-[#161b22]">
                <Trophy className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-gray-500" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">No competitions yet.</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                  Join a{' '}
                  <Link to="/competitions" className="text-indigo-500 hover:underline">
                    compétition
                  </Link>
                  .
                </p>
              </div>
            )}
            {!loadingComps &&
              competitions.map((comp) => (
                <Link
                  key={comp._id}
                  to={`/competitions/${comp._id}`}
                  className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-purple-500/40 hover:shadow-md hover:shadow-purple-500/5 dark:border-[#30363d] dark:bg-[#161b22] dark:hover:border-purple-500/40"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 dark:from-purple-500/15 dark:to-indigo-500/15">
                    <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{comp.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {comp.type && <span className="capitalize">{comp.type}</span>}
                      {comp.startTime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(comp.startTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${
                      COMP_STATUS_STYLE[comp.status] ?? COMP_STATUS_STYLE.closed
                    }`}
                  >
                    {comp.status}
                  </span>

                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 dark:text-gray-500" />
                </Link>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Sub-components ───── */

function ChallengeCard({ group }: { group: { challenge: { _id: string; title: string; difficulty: string }; submissions: SubmissionRow[] } }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const latestSub = group.submissions[0];
  const isSolved = group.submissions.some(s => s.status === 'accepted');

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
      {/* Header Panel */}
      <div 
        className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-[#1c2128]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="shrink-0">
          {isSolved ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Code2 className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-white">{group.challenge.title}</span>
            <span className={`text-xs font-medium capitalize ${DIFFICULTY_STYLE[group.challenge.difficulty] ?? ''}`}>
              {group.challenge.difficulty}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{group.submissions.length} attempt{group.submissions.length > 1 ? 's' : ''}</span>
            <span>•</span>
            <span>Latest: {timeAgo(latestSub.createdAt)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            to={`/challenges/${group.challenge._id}`}
            onClick={(e) => e.stopPropagation()}
            className="hidden rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white dark:border-[#30363d] dark:text-gray-300 dark:hover:bg-[#21262d] sm:block"
          >
            Go to challenge
          </Link>
          <div className="text-gray-400">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Attempts List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-100 bg-slate-50/50 dark:border-[#30363d] dark:bg-[#0d1117]/30"
          >
            <div className="divide-y divide-slate-100 dark:divide-[#30363d]">
              {group.submissions.map((sub) => (
                <SubmissionAttemptItem key={sub._id} sub={sub} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubmissionAttemptItem({ sub }: { sub: SubmissionRow }) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sub.code);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <div className={`h-2 w-2 rounded-full ${sub.status === 'accepted' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className={`font-semibold ${STATUS_STYLE[sub.status]?.split(' ')[1]}`}>
            {STATUS_LABEL[sub.status] ?? sub.status}
          </span>
          <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">•</span>
          <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">
            {LANG_DISPLAY[sub.language] ?? sub.language}
          </span>
          <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">•</span>
          <span className="text-gray-500 dark:text-gray-400">
            {sub.passedTests}/{sub.totalTests} tests
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(sub.createdAt)}</span>
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            {showCode ? 'Hide code' : 'View code'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-inner dark:border-slate-800"
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/50 px-4 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source Code ({sub.language})</span>
              <button
                onClick={handleCopy}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy code"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <pre className="max-h-[300px] overflow-auto p-4 text-xs leading-relaxed text-slate-300 font-mono">
              <code>{sub.code}</code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default History;
