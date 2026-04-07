import { memo, useCallback, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play } from 'lucide-react';
import { Button } from '../../../shared/components';
import { codeExecutionApi } from '../../../services/api';
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
  code: string;
  onCodeChange: (value: string) => void;
  selectedLang: string;
  onLanguageChange: (lang: string) => void;
  onRun: () => void;
  running: boolean;
  runResult: {
    results: Array<{
      testNumber: number;
      passed: boolean;
    }>;
    overall: { passed: number; total: number };
    executionTimeMs?: number;
  } | null;
  result: SubmitResult | null;
  error: string | null;
  theme: 'light' | 'dark';
  isAdmin: boolean;
  className?: string;
}

function SubmissionPanelComponent({
  competition,
  challenge,
  code,
  onCodeChange,
  selectedLang,
  onLanguageChange,
  onRun,
  running,
  runResult,
  result,
  error,
  theme,
  isAdmin,
  className = '',
}: SubmissionPanelProps) {
  const config = COMPETITION_TYPE_CONFIG[competition.type as keyof typeof COMPETITION_TYPE_CONFIG];
  const scoreLabel = config?.scoreUnit ?? 'score';
  const [manualInput, setManualInput] = useState('');
  const [manualExpectedOutput, setManualExpectedOutput] = useState('');
  const [manualRunning, setManualRunning] = useState(false);
  const [manualResult, setManualResult] = useState<{
    passed: boolean;
    output: string;
    error?: string;
    executionTimeMs?: number;
  } | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (isAdmin) {
      if (!running) onRun();
      return;
    }

    if (!manualExpectedOutput.trim()) {
      setManualResult(null);
      setManualError('Entre le resultat attendu avant de lancer le test.');
      return;
    }

    setManualRunning(true);
    setManualResult(null);
    setManualError(null);
    try {
      const response = await codeExecutionApi.execute({
        code,
        language: selectedLang === 'cpp' ? 'c++' : selectedLang,
        testCases: [
          {
            input: manualInput,
            expectedOutput: manualExpectedOutput,
          },
        ],
      });

      const first = response.data?.results?.[0];
      setManualResult({
        passed: Boolean(first?.passed),
        output: first?.output ?? '',
        error: first?.error ?? undefined,
        executionTimeMs: first?.executionTime,
      });
    } catch (runError: any) {
      setManualError(runError?.response?.data?.message || runError?.message || 'Manual test failed');
    } finally {
      setManualRunning(false);
    }
  }, [code, isAdmin, manualExpectedOutput, manualInput, onRun, running, selectedLang]);

  if (!challenge) return null;

  const languages = competition.supportedLanguages?.length
    ? competition.supportedLanguages
    : challenge.languages || ['python', 'javascript'];

  return (
    <section className={`bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 ${className}`} aria-labelledby="submission-heading">
      <h2 id="submission-heading" className="text-lg font-semibold text-emerald-400 mb-4">
        Code Editor
      </h2>
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
          {languages.map((language) => (
            <option key={language} value={language}>
              {language === 'cpp' ? 'C++' : language}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-shadow">
        <Editor
          height="320px"
          language={MONACO_LANG[selectedLang] ?? selectedLang}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={code}
          onChange={(value) => onCodeChange(value ?? '')}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
          aria-label="Code editor"
        />
      </div>

      {!isAdmin && (
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Manual Input</label>
            <textarea
              rows={4}
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              placeholder="Entre l'input a tester"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Output</label>
            <textarea
              rows={4}
              value={manualExpectedOutput}
              onChange={(event) => setManualExpectedOutput(event.target.value)}
              placeholder="Entre le resultat attendu"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>
        </div>
      )}

      <Button
        onClick={handleRun}
        disabled={isAdmin ? running : manualRunning}
        loading={isAdmin ? running : manualRunning}
        className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white border-0 focus:ring-slate-500"
        aria-busy={isAdmin ? running : manualRunning}
      >
        <Play className="w-4 h-4" aria-hidden />
        {isAdmin ? (running ? 'Testing...' : 'Test auto') : (manualRunning ? 'Testing...' : 'Test manuel')}
      </Button>

      {(error || manualError) && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {manualError || error}
        </p>
      )}

      {isAdmin && runResult && (
        <div className="mt-3 rounded-lg border border-slate-500/30 bg-slate-500/10 p-3 text-sm text-slate-200" role="status">
          <strong>Automatic test result</strong>
          <div className="mt-1">Tests: {runResult.overall.passed}/{runResult.overall.total}</div>
          {runResult.executionTimeMs != null && <div>Runtime: {runResult.executionTimeMs} ms</div>}
        </div>
      )}

      {!isAdmin && manualResult && (
        <div
          className={`mt-3 rounded-lg border p-3 text-sm ${
            manualResult.passed
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
          role="status"
        >
          <strong>{manualResult.passed ? 'Manual test passed' : 'Manual test failed'}</strong>
          <div className="mt-1">Output: {manualResult.output || '(empty)'}</div>
          {manualResult.executionTimeMs != null && <div>Runtime: {manualResult.executionTimeMs} ms</div>}
          {manualResult.error && <div>Error: {manualResult.error}</div>}
        </div>
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
          <strong>{result.status === 'accepted' ? 'Accepted' : 'Not accepted'}</strong>
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
