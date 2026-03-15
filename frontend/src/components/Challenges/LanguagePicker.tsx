/**
 * Language selection grid: one card per supported language with icon + Unsolved/Solved badge.
 * Aligns with Piston/EMKC: stdin → program → stdout. One completion per language.
 */
import { CheckCircle2, Circle } from 'lucide-react';

const LANGUAGE_META: Record<
  string,
  { label: string; icon: string; bg: string; border: string; hover: string }
> = {
  javascript: {
    label: 'JavaScript',
    icon: 'JS',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-500/30 dark:border-amber-500/40',
    hover: 'hover:border-amber-500/60 hover:bg-amber-500/20 dark:hover:bg-amber-500/25',
  },
  python: {
    label: 'Python',
    icon: 'Py',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    border: 'border-blue-500/30 dark:border-blue-500/40',
    hover: 'hover:border-blue-500/60 hover:bg-blue-500/20 dark:hover:bg-blue-500/25',
  },
  java: {
    label: 'Java',
    icon: 'Ja',
    bg: 'bg-orange-500/10 dark:bg-orange-500/15',
    border: 'border-orange-500/30 dark:border-orange-500/40',
    hover: 'hover:border-orange-500/60 hover:bg-orange-500/20 dark:hover:bg-orange-500/25',
  },
  cpp: {
    label: 'C++',
    icon: 'C++',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    border: 'border-cyan-500/30 dark:border-cyan-500/40',
    hover: 'hover:border-cyan-500/60 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/25',
  },
};

interface LanguagePickerProps {
  languages: string[];
  completedLanguages: string[];
  onSelect: (lang: string) => void;
  disabled?: boolean;
}

export function LanguagePicker({
  languages,
  completedLanguages,
  onSelect,
  disabled = false,
}: LanguagePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {languages.map((lang) => {
        const meta = LANGUAGE_META[lang] ?? {
          label: lang,
          icon: lang.slice(0, 2).toUpperCase(),
          bg: 'bg-gray-500/10 dark:bg-gray-500/15',
          border: 'border-gray-500/30 dark:border-gray-500/40',
          hover: 'hover:border-gray-500/60 hover:bg-gray-500/20',
        };
        const solved = completedLanguages.includes(lang);
        return (
          <button
            key={lang}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(lang)}
            className={`
              relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2
              transition-all duration-200 text-left
              ${meta.bg} ${meta.border} ${!disabled ? meta.hover : 'opacity-70 cursor-not-allowed'}
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
            `}
          >
            <span
              className="text-2xl font-bold text-gray-700 dark:text-gray-200 font-mono"
              aria-hidden
            >
              {meta.icon}
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {meta.label}
            </span>
            <span
              className={`
                inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium
                ${solved
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                  : 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border border-gray-500/30 dark:border-gray-500/40'}
              `}
            >
              {solved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> Solved
                </>
              ) : (
                <>
                  <Circle className="w-3.5 h-3.5" aria-hidden /> Unsolved
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default LanguagePicker;
