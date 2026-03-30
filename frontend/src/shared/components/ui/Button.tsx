import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
  secondary: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white focus:ring-slate-500 dark:focus:ring-slate-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  ghost: 'bg-transparent hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 focus:ring-slate-500',
};

export function Button({
  variant = 'primary',
  fullWidth,
  loading,
  loadingLabel = 'Loading',
  disabled,
  type = 'button',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      className={`
        inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <span aria-hidden className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          <span>{loadingLabel}…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
