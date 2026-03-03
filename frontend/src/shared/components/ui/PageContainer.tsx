import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  /** max-width: default 'max-w-4xl', or 'max-w-7xl', 'max-w-md', etc. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '7xl': 'max-w-7xl',
};

export function PageContainer({
  children,
  maxWidth = '4xl',
  className = '',
}: PageContainerProps) {
  return (
    <div
      className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${maxWidthClasses[maxWidth]} ${className}`}
    >
      {children}
    </div>
  );
}
