import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Code2,
  FlaskConical,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { feedbackApi } from '../../services/api';
import type { FeedbackResponse } from '../../types/feedback';
import { cn } from '../../lib/utils';

export interface AiCodeFeedbackPanelProps {
  code: string;
  language: string;
  taskDescription?: string;
  testsPassed?: boolean;
  executionError?: string;
  runtimeMs?: number;
  className?: string;
}

function severityClass(sev: string) {
  if (sev === 'high') return 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200';
  if (sev === 'medium') return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100';
  return 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100';
}

function ContextChip({
  icon: Icon,
  label,
  value,
  variant = 'neutral',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  variant?: 'neutral' | 'ok' | 'warn';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
        variant === 'ok' && 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
        variant === 'warn' && 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100',
        variant === 'neutral' && 'border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      <span
        className={cn(
          variant === 'ok' && 'text-emerald-900 dark:text-emerald-300/90',
          variant === 'warn' && 'text-amber-950 dark:text-amber-100/90',
          variant === 'neutral' && 'text-slate-600 dark:text-slate-400',
        )}
      >
        {label}
      </span>
      <span className="max-w-[140px] truncate">{value}</span>
    </span>
  );
}

export function AiCodeFeedbackPanel({
  code,
  language,
  taskDescription,
  testsPassed,
  executionError,
  runtimeMs,
  className,
}: AiCodeFeedbackPanelProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const lastAnalyzedSig = useRef<string>('');
  const lastPayloadRef = useRef<{
    code: string;
    language: string;
    task_description?: string;
    tests_passed?: boolean;
    execution_error?: string;
    runtime_ms?: number;
  } | null>(null);

  const contextSig = useMemo(
    () =>
      JSON.stringify({
        code,
        language,
        taskDescription,
        testsPassed,
        executionError,
        runtimeMs,
      }),
    [code, language, taskDescription, testsPassed, executionError, runtimeMs],
  );

  const stale =
    feedback &&
    lastAnalyzedSig.current &&
    lastAnalyzedSig.current !== contextSig;

  useEffect(() => {
    setCopied(false);
  }, [feedback]);

  const analyze = async () => {
    if (!code.trim()) {
      setErr('Write some code before starting analysis.');
      return;
    }
    setLoading(true);
    setErr(null);
    setStatusMessage('Starting analysis');
    const payload = {
      code,
      language,
      task_description: taskDescription,
      tests_passed: testsPassed,
      execution_error: executionError,
      runtime_ms: runtimeMs,
    };
    lastPayloadRef.current = payload;
    try {
      const res = await feedbackApi.analyze(payload);
      const data = res.data as FeedbackResponse;
      setFeedback(data);
      lastAnalyzedSig.current = contextSig;
      setStatusMessage(`Analysis completed. Score ${data.overall_score} out of 100.`);
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number; data?: { message?: string } } };
      if (ax.response?.status === 429) {
        setErr('Too many requests. Please try again shortly.');
      } else if (ax.response?.status === 503 || ax.response?.status === 502 || ax.response?.status === 504) {
        setErr('Analysis service is temporarily unavailable. Please retry.');
      } else if (ax.response?.status === 408) {
        setErr('Analysis timed out. Retry with shorter code or less context.');
      } else {
        setErr(ax.response?.data?.message ?? 'Analysis unavailable.');
      }
      setStatusMessage('Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const retryLast = async () => {
    if (!lastPayloadRef.current || loading) return;
    setLoading(true);
    setErr(null);
    setStatusMessage('Retrying analysis');
    try {
      const res = await feedbackApi.analyze(lastPayloadRef.current);
      const data = res.data as FeedbackResponse;
      setFeedback(data);
      lastAnalyzedSig.current = contextSig;
      setStatusMessage(`Analysis completed. Score ${data.overall_score} out of 100.`);
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number; data?: { message?: string } } };
      setErr(ax.response?.data?.message ?? 'Analysis unavailable.');
      setStatusMessage('Retry failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    if (!feedback) return;
    const text = [
      `Score: ${feedback.overall_score}/100`,
      '',
      feedback.summary,
      '',
      ...(feedback.points ?? []).map(
        (p) => `• [${p.severity}] ${p.title} (${p.category})\n  ${p.description}`,
      ),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Report copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Unable to copy report');
    }
  };

  const testVariant =
    testsPassed === true ? 'ok' : testsPassed === false ? 'warn' : 'neutral';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/95 via-white to-indigo-50/40 shadow-md ring-1 ring-violet-900/5 dark:border-violet-900/40 dark:from-violet-950/50 dark:via-slate-900/90 dark:to-indigo-950/30 dark:ring-white/5',
        className,
      )}
      role="region"
      aria-label="AI coach - code analysis"
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
      <div className="border-b border-violet-200/60 px-4 py-3 dark:border-violet-900/30">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm dark:bg-violet-500">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI coach</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Quality, risk, and improvement analysis (Python/LLM service).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void analyze()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {loading ? 'Analyzing...' : 'Analyze my code'}
            </button>
            {err && lastPayloadRef.current && (
              <button
                type="button"
                onClick={() => void retryLast()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:bg-slate-800 dark:text-violet-200 dark:hover:bg-slate-700"
              >
                Retry
              </button>
            )}
            {feedback && (
              <button
                type="button"
                onClick={() => void copyReport()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-800 dark:text-violet-200 dark:hover:bg-slate-700"
              >
                {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied ? 'Copied' : 'Copy report'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <ContextChip icon={Code2} label="Language" value={language || '-'} />
          <ContextChip
            icon={FlaskConical}
            label="Tests"
            value={
              testsPassed === true ? 'OK' : testsPassed === false ? 'Failed / partial' : 'Not run'
            }
            variant={testVariant}
          />
          {runtimeMs != null && Number.isFinite(runtimeMs) && (
            <ContextChip icon={Timer} label="Time" value={`${Math.round(runtimeMs)} ms`} />
          )}
          {executionError && (
            <ContextChip icon={AlertTriangle} label="Exec error" value={executionError.slice(0, 40) + (executionError.length > 40 ? '...' : '')} variant="warn" />
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Your code and context are sent to the internal analysis service to generate coaching feedback.
        </p>
      </div>

      <div className="p-4">
        {!feedback && !loading && !err && (
          <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 text-xs text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
            Better reports come from running tests first, including the task description, and sharing runtime/error context.
          </div>
        )}
        {stale && (
          <p
            className="mb-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            Code or context changed since the last analysis. Run again for an up-to-date report.
          </p>
        )}

        {err && (
          <p
            className="mb-3 rounded-xl border border-red-300 bg-red-100 px-3 py-2 text-sm font-medium text-red-950 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {err}
          </p>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10" aria-busy="true">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-900 dark:border-t-violet-400" />
            <p className="text-sm text-slate-700 dark:text-slate-400">Sending to analysis model...</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {feedback && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="space-y-4 text-sm"
            >
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                    Overall score
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tabular-nums text-violet-700 dark:text-violet-300">
                      {feedback.overall_score}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-400">/100</span>
                  </div>
                </div>
                <div
                  className="h-2 flex-1 min-w-[120px] max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                  role="progressbar"
                  aria-valuenow={feedback.overall_score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Score"
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, feedback.overall_score))}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="prose prose-slate prose-sm max-w-none text-slate-800 dark:prose-invert prose-p:leading-relaxed prose-headings:text-slate-900 dark:prose-headings:text-slate-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedback.summary}</ReactMarkdown>
              </div>

              <ul className="space-y-2.5">
                {feedback.points?.map((p, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn('rounded-xl border px-3 py-2.5 text-xs', severityClass(p.severity))}
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold">{p.title}</span>
                      <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide dark:bg-white/10">
                        {p.category}
                      </span>
                      <span className="text-[10px] uppercase opacity-60">{p.severity}</span>
                    </div>
                    <div className="mt-1.5 opacity-95">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.description}</ReactMarkdown>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
