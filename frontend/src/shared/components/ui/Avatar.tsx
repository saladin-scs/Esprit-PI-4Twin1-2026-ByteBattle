import type { ImgHTMLAttributes } from 'react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';

type Size = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  /** Image URL; if missing, shows initial letter from fallback. */
  src?: string | null;
  /** Fallback text for initial (e.g. username or displayName). */
  fallback: string;
  size?: Size;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  xs: 'h-7 w-7 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-9 w-9 text-sm',
  lg: 'h-10 w-10 text-base',
};

function getInitial(fallback: string): string {
  const trimmed = (fallback || 'U').trim();
  return trimmed.charAt(0).toUpperCase();
}

export function Avatar({ src, fallback, size = 'md', className = '', ...imgProps }: AvatarProps) {
  const initial = getInitial(fallback);
  const sizeClass = sizeClasses[size];
  const resolvedSrc = resolveMediaUrl(src);

  if (resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
        alt=""
        loading="lazy"
        className={`inline-block rounded-full object-cover ring-2 ring-white dark:ring-gray-700 shadow-header ${sizeClass} ${className}`}
        {...imgProps}
      />
    );
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-full font-semibold
        bg-gradient-to-br from-pastel-sky to-pastel-lavender dark:from-gray-600 dark:to-gray-700
        text-pastel-ink dark:text-gray-200
        ring-2 ring-white dark:ring-gray-700 shadow-header
        ${sizeClass} ${className}
      `}
      aria-hidden
    >
      {initial}
    </span>
  );
}
