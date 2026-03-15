
export const DIFFICULTY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  easy: {
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    label: 'Easy',
  },
  medium: {
    bg: 'bg-amber-500/15 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/30',
    label: 'Medium',
  },
  hard: {
    bg: 'bg-red-500/15 dark:bg-red-500/20',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-500/30',
    label: 'Hard',
  },
  expert: {
    bg: 'bg-violet-500/15 dark:bg-violet-500/20',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-500/30',
    label: 'Expert',
  },
};

interface DifficultyBadgeProps {
  difficulty: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function DifficultyBadge({ difficulty, className = '', size = 'md' }: DifficultyBadgeProps) {
  const key = difficulty?.toLowerCase() || 'easy';
  const config = DIFFICULTY_CONFIG[key] ?? {
    bg: 'bg-gray-500/15 dark:bg-gray-500/20',
    text: 'text-gray-700 dark:text-gray-400',
    border: 'border-gray-500/30',
    label: difficulty || '—',
  };
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs font-semibold px-2.5 py-1';
  return (
    <span
      className={`inline-flex items-center rounded-md border ${config.bg} ${config.text} ${config.border} ${sizeClass} ${className}`}
    >
      {config.label}
    </span>
  );
}
