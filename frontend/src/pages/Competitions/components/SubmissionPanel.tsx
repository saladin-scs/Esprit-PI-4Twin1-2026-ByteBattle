import { memo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Send } from 'lucide-react';
import { Button } from '../../../shared/components';
import type { CompetitionDetail } from '../types';
import type { SubmitResult } from '../types';
import { COMPETITION_TYPE_CONFIG } from '../types';

const MONACO_LANG: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
};

interface SubmissionPanelProps {
  competition: CompetitionDetail;
  challenge: { title: string; languages: string[]; starterCode: Record<string, string> } | null;
  challenges?: Array<{ _id: string; title: string }>;
  selectedChallengeId?: string;
  onChallengeChange?: (challengeId: string) => void;
  code: string;
  onCodeChange: (value: string) => void;
  selectedLang: string;
  onLanguageChange: (lang: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  result: SubmitResult | null;
  error: string | null;
  theme: 'light' | 'dark';
  className?: string;
}

function SubmissionPanelComponent({
  competition,
  challenge,
  challenges = [],
  selectedChallengeId,
  onChallengeChange,
  code,
  onCodeChange,
  selectedLang,
  onLanguageChange,
  onSubmit,
  submitting,
  result,
  error,
  theme,
  className = '',
}: SubmissionPanelProps) {
  const isActive = competition.status === 'active';
  const config = COMPETITION_TYPE_CONFIG[competition.type as keyof typeof COMPETITION_TYPE_CONFIG];
  const scoreLabel = config?.scoreUnit ?? 'score';

  const handleSubmit = useCallback(() => {
    if (!submitting && isActive) onSubmit();
  }, [onSubmit, submitting, isActive]);

  const challengeMissing = !challenge;
  const selectedChallengeValue = selectedChallengeId ?? challenges[0]?._id ?? '';
  const languages = competition.supportedLanguages?.length
    ? competition.supportedLanguages
    : challenge?.languages || ['python', 'javascript'];

  return (
    <section className={`bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 ${className}`} aria-labelledby="submission-heading">
      <h2 id="submission-heading" className="text-lg font-semibold text-emerald-400 mb-4">
        Submission
      </h2>
      {challengeMissing && (
        <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          Challenge details are currently unavailable. You can still write your code here.
        </p>
      )}
      {challenges.length > 1 && (
        <div className="mb-3">
          <label htmlFor="submission-challenge" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Challenge
          </label>
          <select
            id="submission-challenge"
            value={selectedChallengeValue}
            onChange={(e) => onChallengeChange?.(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            aria-label="Select challenge"
          >
            {challenges.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mb-3">
        <label htmlFor="submission-lang" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Language
        </label>
        <select
          id="submission-lang"
          value={selectedLang}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          aria-label="Select programming language"
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-shadow">
        <Editor
          height="320px"
          language={MONACO_LANG[selectedLang] ?? selectedLang}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={code}
          onChange={(v) => onCodeChange(v ?? '')}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
          aria-label="Code editor"
        />
      </div>
      {!isActive && (
        <p className="text-amber-400 text-sm mb-3" role="status">
          Submissions are closed for this contest.
        </p>
      )}
      <Button
        onClick={handleSubmit}
        disabled={submitting || !isActive}
        loading={submitting}
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0 focus:ring-emerald-500"
        aria-busy={submitting}
      >
        <Send className="w-4 h-4" aria-hidden />
        {submitting ? 'Submitting…' : 'Submit'}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            result.status === 'accepted'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-red-500/20 text-red-300 border border-red-500/40'
          }`}
          role="status"
        >
          <strong>{result.status === 'accepted' ? '✅ Accepted' : '❌ Not accepted'}</strong>
          <div className="mt-1">Tests: {result.passedTests}/{result.totalTests}</div>
          <div>
            {scoreLabel}: {result.score}
            {competition.type === 'speed' && ` (${result.executionTimeMs} ms)`}
          </div>
          {result.isBest && (
            <div className="font-semibold text-amber-400 mt-1">New best submission!</div>
          )}
        </div>
      )}
    </section>
  );
}

export const SubmissionPanel = memo(SubmissionPanelComponent);
