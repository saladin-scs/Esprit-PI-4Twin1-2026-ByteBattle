import React, { useEffect, useState } from 'react';
import { ThumbsUp, Code as CodeIcon, Clock, HardDrive } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { challengesApi } from '../../services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Solution {
  _id: string;
  user?: { _id: string; username: string };
  userId?: { _id: string; username: string };
  code: string;
  language: string;
  explanation: string;
  timeComplexity: string;
  spaceComplexity: string;
  upvotes: number;
  upvotedBy: string[];
  createdAt: string;
}

interface CommunitySolutionsProps {
  challengeId: string;
}

const CommunitySolutions: React.FC<CommunitySolutionsProps> = ({ challengeId }) => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('upvotes');
  const [expandedSolutionId, setExpandedSolutionId] = useState<string | null>(null);

  const fetchSolutions = async () => {
    setLoading(true);
    try {
      const res = await challengesApi.getSolutions(challengeId, { page, limit: 10, sortBy });
      const data = res.data as { solutions: Solution[]; totalPages: number };
      setSolutions(data.solutions ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError('Failed to load community solutions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, [challengeId, page, sortBy]);

  const handleUpvote = async (solutionId: string) => {
    try {
      const res = await challengesApi.upvoteSolution(solutionId);
      const data = res.data as { upvotes: number; upvotedBy: string[] };
      setSolutions((prev) =>
        prev.map((s) => (s._id === solutionId ? { ...s, upvotes: data.upvotes, upvotedBy: data.upvotedBy } : s))
      );
    } catch {
      // ignore
    }
  };

  if (loading && solutions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return <div className="py-4 text-red-600 dark:text-red-400 text-sm">{error}</div>;
  }

  return (
    <div className="py-2 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white m-0">Community solutions</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="upvotes">Most upvoted</option>
          <option value="recent">Most recent</option>
        </select>
      </div>

      {solutions.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No solutions yet. Be the first to share!</p>
      ) : (
        <div className="space-y-4">
          {solutions.map((sol) => {
            const isExpanded = expandedSolutionId === sol._id;
            return (
              <div
                key={sol._id}
                className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50 overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-left bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 transition-colors"
                  onClick={() => setExpandedSolutionId(isExpanded ? null : sol._id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                      {(sol.user ?? sol.userId)?.username?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{(sol.user ?? sol.userId)?.username ?? 'User'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {sol.language} · {new Date(sol.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5" /> {sol.timeComplexity}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <HardDrive className="w-3.5 h-3.5" /> {sol.spaceComplexity}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(sol._id);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <ThumbsUp className="w-4 h-4 text-amber-500" /> {sol.upvotes}
                    </button>
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {sol.explanation && (
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed markdown-body">
                        <ReactMarkdown>{sol.explanation}</ReactMarkdown>
                      </div>
                    )}
                    <div className="relative rounded-lg bg-gray-900 p-4">
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-gray-400">
                        <CodeIcon className="w-3.5 h-3.5" /> {sol.language}
                      </div>
                      <pre className="mt-4 overflow-x-auto text-sm text-gray-200 font-mono whitespace-pre">
                        <code>{sol.code}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="px-4 text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CommunitySolutions;
