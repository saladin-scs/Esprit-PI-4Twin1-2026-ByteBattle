import React from 'react';
import { Search } from 'lucide-react';

const DIFFICULTIES = ['All', 'easy', 'medium', 'hard', 'expert'] as const;
const LANGUAGES = ['All', 'javascript', 'python', 'java', 'cpp', 'c', 'c#', 'go', 'rust'] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  All: 'All languages',
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  'c#': 'C#',
  go: 'Go',
  rust: 'Rust',
};

const DIFF_LABELS: Record<string, string> = {
  All: 'All difficulties',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

interface ChallengeFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  difficulty: string;
  onDifficultyChange: (v: string) => void;
  language: string;
  onLanguageChange: (v: string) => void;
  onSearch: (e: React.FormEvent) => void;
  placeholder?: string;
}

export default function ChallengeFilters({
  search,
  onSearchChange,
  difficulty,
  onDifficultyChange,
  language,
  onLanguageChange,
  onSearch,
  placeholder = 'Search challenges...',
}: ChallengeFiltersProps) {
  return (
    <form onSubmit={onSearch} className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-sm"
        />
      </div>
      <select
        value={difficulty}
        onChange={(e) => onDifficultyChange(e.target.value)}
        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
      >
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>{DIFF_LABELS[d] ?? d}</option>
        ))}
      </select>
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>{LANGUAGE_LABELS[l] ?? l}</option>
        ))}
      </select>
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium text-sm transition-colors"
      >
        Search
      </button>
    </form>
  );
}
