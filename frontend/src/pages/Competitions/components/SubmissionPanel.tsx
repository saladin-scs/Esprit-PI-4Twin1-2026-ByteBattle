import { memo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Send } from 'lucide-react';
import { Button } from '../../../shared/components';
import type { CompetitionDetail } from '../types';
import type { SubmitResult } from '../types';
import { COMPETITION_TYPE_CONFIG } from '../types';
import { cn } from '../../../lib/utils';

const MONACO_LANG: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
};

interface SubmissionPanelProps {
  competition: CompetitionDetail;
  challenge: { title: string; languages: string[]; starterCode: Record<string, string> } | null;
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

  if (!challenge) return null;

  const languages = competition.supportedLanguages?.length
    ? competition.supportedLanguages
    : challenge.languages || ['python', 'javascript'];

  const isDark = theme === 'dark';

  return (
    <section
      className={cn('bb-submission-shell', className)}
      aria-labelledby="submission-heading"
    >
      <h2 id="submission-heading" className="bb-section-title mb-4">
        Submission
      </h2>
      <div className="mb-3">
        <label
          htmlFor="submission-lang"
          className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Language
        </label>
        <select
          id="submission-lang"
          value={selectedLang}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="bb-select"
          aria-label="Select programming language"
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="bb-editor-ring mb-3 overflow-hidden">
        <Editor
          height="320px"
          language={MONACO_LANG[selectedLang] ?? selectedLang}
          theme={isDark ? 'vs-dark' : 'light'}
          value={code}
          onChange={(v) => onCodeChange(v ?? '')}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
          aria-label="Code editor"
        />
      </div>
      {!isActive && (
        <p className="mb-3 text-sm text-amber-600 dark:text-amber-400" role="status">
          Submissions are closed for this contest.
        </p>
      )}
      <Button
        onClick={handleSubmit}
        disabled={submitting || !isActive}
        loading={submitting}
        className="inline-flex items-center gap-2 border-0 bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500"
        aria-busy={submitting}
      >
        <Send className="h-4 w-4" aria-hidden />
        {submitting ? 'Submitting…' : 'Submit'}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div
          className={cn(
            'mt-3 rounded-lg border p-3 text-sm',
            result.status === 'accepted'
              ? 'border-primary-500/40 bg-primary-500/10 text-primary-900 dark:text-primary-200'
              : 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300',
          )}
          role="status"
        >
          <strong>{result.status === 'accepted' ? '✅ Accepted' : '❌ Not accepted'}</strong>
          <div className="mt-1">
            Tests: {result.passedTests}/{result.totalTests}
          </div>
          <div>
            {scoreLabel}: {result.score}
            {competition.type === 'speed' && ` (${result.executionTimeMs} ms)`}
          </div>
          {result.isBest && (
            <div className="mt-1 font-semibold text-amber-600 dark:text-amber-400">New best submission!</div>
          )}
        </div>
      )}
    </section>
  );
}

export const SubmissionPanel = memo(SubmissionPanelComponent);
