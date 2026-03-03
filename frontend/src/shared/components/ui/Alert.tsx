type Variant = 'error' | 'success' | 'info';

interface AlertProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  error: 'bg-red-50 dark:bg-red-600/20 border-red-500 text-red-800 dark:text-red-200',
  success: 'bg-green-50 dark:bg-green-600/20 border-green-500 text-green-800 dark:text-green-200',
  info: 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-800 dark:text-blue-200',
};

export function Alert({ variant = 'error', children, className = '' }: AlertProps) {
  return (
    <div
      className={`p-3 rounded-lg border ${variantClasses[variant]} ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
}
