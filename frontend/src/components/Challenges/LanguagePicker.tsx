/**
 * Language selection grid: one card per supported language with SVG icon + Solved/Unsolved badge.
 * Pro UX: recognizable logos, hover scale, clear status icons.
 */
import { CheckCircle2, Circle, Code2 } from 'lucide-react';
import { LanguageIcon } from './LanguageIcons';

const LANGUAGE_META: Record<
  string,
  { label: string; bg: string; border: string; hover: string; iconColor: string }
> = {
  javascript: {
    label: 'JavaScript',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-500/30 dark:border-amber-500/40',
    hover: 'hover:border-amber-500/60 hover:bg-amber-500/20 dark:hover:bg-amber-500/25 hover:shadow-lg hover:scale-[1.02]',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  python: {
    label: 'Python',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    border: 'border-blue-500/30 dark:border-blue-500/40',
    hover: 'hover:border-blue-500/60 hover:bg-blue-500/20 dark:hover:bg-blue-500/25 hover:shadow-lg hover:scale-[1.02]',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  java: {
    label: 'Java',
    bg: 'bg-orange-500/10 dark:bg-orange-500/15',
    border: 'border-orange-500/30 dark:border-orange-500/40',
    hover: 'hover:border-orange-500/60 hover:bg-orange-500/20 dark:hover:bg-orange-500/25 hover:shadow-lg hover:scale-[1.02]',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  cpp: {
    label: 'C++',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    border: 'border-cyan-500/30 dark:border-cyan-500/40',
    hover: 'hover:border-cyan-500/60 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/25 hover:shadow-lg hover:scale-[1.02]',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
};

interface LanguagePickerProps {
  languages: string[];
  completedLanguages: string[];
  onSelect: (lang: string) => void;
  disabled?: boolean;
  /** Optional: show section title with icon */
  title?: string;
}

export function LanguagePicker({
  languages,
  completedLanguages,
  onSelect,
  disabled = false,
  title,
}: LanguagePickerProps) {
  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Code2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" aria-hidden />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {languages.map((lang) => {
          const meta = LANGUAGE_META[lang] ?? {
            label: lang,
            bg: 'bg-gray-500/10 dark:bg-gray-500/15',
            border: 'border-gray-500/30 dark:border-gray-500/40',
            hover: 'hover:border-gray-500/60 hover:bg-gray-500/20 hover:shadow-lg hover:scale-[1.02]',
            iconColor: 'text-gray-600 dark:text-gray-400',
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
                transition-all duration-200 ease-out text-left
                ${meta.bg} ${meta.border} ${!disabled ? meta.hover : 'opacity-70 cursor-not-allowed'}
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                active:scale-[0.98]
              `}
            >
              <div className="w-14 h-14 flex items-center justify-center shrink-0 rounded-xl bg-white/80 dark:bg-black/20 p-2 ring-1 ring-black/5 dark:ring-white/10">
                <LanguageIcon lang={lang} size={36} />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {meta.label}
              </span>
              <span
                className={`
                  inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
                  ${solved
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                    : 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border border-gray-500/30 dark:border-gray-500/40'}
                `}
              >
                {solved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden /> Solved
                  </>
                ) : (
                  <>
                    <Circle className="w-3.5 h-3.5 shrink-0" aria-hidden /> Unsolved
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LanguagePicker;
