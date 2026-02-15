import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchChallenge } from '../../store/slices/challengesSlice';
import { AppDispatch, RootState } from '../../store/store';
import Editor from '@monaco-editor/react';
import { codeExecutionApi, feedbackApi } from '../../services/api';
import FeedbackDisplay from '../../components/Feedback/FeedbackDisplay';
import { FeedbackResponse } from '../../types/feedback';
import type { Challenge, TestCase } from '../../types/challenge';

const STORAGE_KEY_PREFIX = 'bytebattle-challenge-';

/** Get starter code for the selected language */
function getStarterCode(challenge: Challenge | null, language: string): string {
  if (!challenge?.starterCode) return '';
  const sc = challenge.starterCode;
  if (typeof sc === 'string') return sc;
  return (sc as Record<string, string>)?.[language] ?? '';
}

/** Map challenge test cases to execution format (input, expectedOutput) */
function toExecuteTestCases(testCases: TestCase[] = []): { input: string; expectedOutput: string }[] {
  return testCases.map((tc) => ({
    input: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input ?? ''),
    expectedOutput: String(tc.expectedOutput ?? '').trim(),
  }));
}

function ChallengeDetail() {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { currentChallenge } = useSelector(
    (state: RootState) => state.challenges
  );
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [results, setResults] = useState<any>(null);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'feedback'>('results');

  useEffect(() => {
    if (id) {
      dispatch(fetchChallenge(id));
    }
  }, [id, dispatch]);

  // Load/save code from localStorage per challenge + language
  const storageKey = useMemo(
    () => (id ? `${STORAGE_KEY_PREFIX}${id}-${language}` : null),
    [id, language]
  );

  useEffect(() => {
    if (!currentChallenge || !id || currentChallenge._id !== id || !storageKey) return;
    const starter = getStarterCode(currentChallenge, language);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved != null && saved.trim()) {
        setCode(saved);
      } else {
        setCode(starter);
      }
    } catch {
      setCode(starter);
    }
  }, [currentChallenge?._id, id, language, storageKey]);

  const persistCode = useCallback(
    (value: string) => {
      setCode(value);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, value);
        } catch {
          /* ignore */
        }
      }
    },
    [storageKey]
  );

  const resetToStarter = useCallback(() => {
    if (!currentChallenge) return;
    const starter = getStarterCode(currentChallenge, language);
    persistCode(starter);
    setResults(null);
    setFeedback(null);
  }, [currentChallenge, language, persistCode]);

  const handleRun = useCallback(async () => {
    if (!currentChallenge) return;
    setLoading(true);
    setFeedback(null);
    setActiveTab('results');
    try {
      const response = await codeExecutionApi.execute({
        code,
        language,
        testCases: toExecuteTestCases(currentChallenge.testCases),
      });
      setResults(response.data);

      // Get feedback after execution
      await fetchFeedback(response.data);
      setActiveTab('feedback');
    } catch (error) {
      console.error('Execution error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentChallenge, code, language]);

  const fetchFeedback = async (executionResults?: any) => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    setFeedbackLoading(true);
    try {
      // Calculate if all tests passed (if execution results provided)
      const allTestsPassed = executionResults
        ? executionResults?.overall?.passed === executionResults?.overall?.total
        : undefined;

      // Calculate average runtime if available
      const avgRuntime = executionResults?.results?.length
        ? executionResults.results.reduce(
            (sum: number, r: any) => sum + (r.executionTime || 0),
            0
          ) / executionResults.results.length
        : undefined;

      // Check for execution errors
      const hasError = executionResults?.results?.some(
        (r: any) => r.error && r.error.trim()
      );
      const executionError = hasError
        ? executionResults?.results?.find((r: any) => r.error)?.error
        : undefined;

      const feedbackResponse = await feedbackApi.analyze({
        code,
        language,
        tests_passed: allTestsPassed,
        execution_error: executionError,
        runtime_ms: avgRuntime ? avgRuntime * 1000 : undefined,
        task_description: currentChallenge?.description,
      });

      setFeedback(feedbackResponse.data);
    } catch (error) {
      console.error('Feedback error:', error);
      // Don't show error to user, feedback is optional
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleGetFeedback = useCallback(async () => {
    setActiveTab('feedback');
    await fetchFeedback();
  }, []);

  // Ctrl+Enter to run
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!loading && !feedbackLoading && currentChallenge) handleRun();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, feedbackLoading, currentChallenge, handleRun]);

  const displayTestCases = useMemo(() => currentChallenge?.testCases ?? [], [currentChallenge]);
  const allTestsPassed = results?.overall?.passed === results?.overall?.total && (results?.overall?.total ?? 0) > 0;

  if (!currentChallenge) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent"></div>
          <span>Loading challenge...</span>
        </div>
      </div>
    );
  }

  const difficultyColors = {
    easy: 'bg-green-600/20 text-green-400 border-green-500/50',
    medium: 'bg-amber-600/20 text-amber-400 border-amber-500/50',
    hard: 'bg-red-600/20 text-red-400 border-red-500/50',
  };
  const diffClass = difficultyColors[currentChallenge.difficulty] ?? difficultyColors.medium;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold text-white">{currentChallenge.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border capitalize ${diffClass}`}>
              {currentChallenge.difficulty}
            </span>
          </div>
          {(currentChallenge.solvedCount > 0 || (currentChallenge.attemptCount ?? 0) > 0) && (
            <div className="flex gap-4 mb-4 text-sm text-gray-400">
              <span>{currentChallenge.solvedCount} solved</span>
              <span>{(currentChallenge.attemptCount ?? 0)} attempts</span>
            </div>
          )}
          {currentChallenge.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentChallenge.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded bg-gray-700/50 text-gray-300 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              {currentChallenge.description}
            </p>
          </div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
            <button
              type="button"
              onClick={resetToStarter}
              className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
              title="Reset to starter code"
            >
              Reset code
            </button>
            <span className="text-gray-500 text-xs ml-auto">
              Ctrl+Enter to run
            </span>
          </div>
          <div className="bg-gray-800 rounded-lg overflow-hidden mb-4">
            <Editor
              height="400px"
              language={language}
              value={code}
              onChange={(value) => persistCode(value ?? '')}
              theme="vs-dark"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={loading || feedbackLoading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run Code'}
            </button>
            <button
              onClick={handleGetFeedback}
              disabled={loading || feedbackLoading || !code.trim()}
              className="px-4 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
              title="Get AI feedback on your code"
            >
              {feedbackLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                '💡 AI Feedback'
              )}
            </button>
          </div>

          {/* Success banner */}
          {allTestsPassed && (
            <div className="mt-4 p-4 rounded-lg bg-green-900/30 border border-green-600/50">
              <div className="flex items-center gap-2 text-green-400">
                <span className="text-xl">🎉</span>
                <span className="font-semibold">All tests passed! Get AI feedback to improve your solution.</span>
              </div>
            </div>
          )}

          {/* Tabs: Results | Feedback */}
          {(results || feedback || feedbackLoading) && (
            <div className="mt-4 flex gap-2 border-b border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                  activeTab === 'results'
                    ? 'bg-gray-800 text-white border-t border-x border-gray-700'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Test Results
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('feedback')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                  activeTab === 'feedback'
                    ? 'bg-gray-800 text-white border-t border-x border-gray-700'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                AI Feedback
              </button>
            </div>
          )}

          {/* Execution Results */}
          {activeTab === 'results' && (
            <div className="bg-gray-800 p-4 rounded-b-lg rounded-tr-lg">
              {results ? (
                <>
                  <h3 className="font-semibold mb-3 text-white">Test Results</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-300">
                    Passed: {results.overall?.passed || 0} / {results.overall?.total || 0}
                  </span>
                  {results.overall?.passed === results.overall?.total ? (
                    <span className="text-green-400 font-semibold">✓ All tests passed!</span>
                  ) : (
                    <span className="text-red-400 font-semibold">✗ Some tests failed</span>
                  )}
                </div>
                {results.results?.map((result: any, index: number) => {
                  const testCaseMeta = displayTestCases[index];
                  const isHidden = testCaseMeta?.isHidden === true;
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded border-l-4 ${
                        result.passed
                          ? 'bg-green-900/20 border-green-500'
                          : 'bg-red-900/20 border-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">
                          Test Case {result.testCase}
                          {isHidden && (
                            <span className="ml-2 text-gray-500 text-xs">(hidden)</span>
                          )}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            result.passed ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {result.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      {result.output && !isHidden && (
                        <div className="text-xs text-gray-400 mt-1">
                          <span className="font-medium">Output:</span> {result.output}
                        </div>
                      )}
                      {result.output && isHidden && (
                        <div className="text-xs text-gray-500 mt-1 italic">
                          Output hidden
                        </div>
                      )}
                      {result.error && (
                        <div className="text-xs text-red-400 mt-1">
                          <span className="font-medium">Error:</span>{' '}
                          {isHidden ? 'Test failed (details hidden)' : result.error}
                        </div>
                      )}
                      {result.executionTime != null && (
                        <div className="text-xs text-gray-500 mt-1">
                          Time: {result.executionTime}ms
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
                </>
              ) : (
                <p className="text-gray-400 text-sm">Run your code to see test results</p>
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <>
              {feedbackLoading && (
                <div className="bg-gray-800 p-4 rounded-b-lg rounded-tr-lg">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    <span>Analyzing code with AI...</span>
                  </div>
                </div>
              )}
              {feedback && !feedbackLoading && (
                <div className="rounded-b-lg overflow-hidden">
                  <FeedbackDisplay feedback={feedback} />
                </div>
              )}
              {!feedback && !feedbackLoading && (
                <div className="bg-gray-800 p-6 rounded-b-lg rounded-tr-lg">
                  <p className="text-gray-400 text-sm">
                    Click <strong className="text-white">AI Feedback</strong> to get intelligent analysis and suggestions for your code.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChallengeDetail;

