import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl text-gray-900 dark:text-gray-100 ${className}`}
    >
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-4">{title}</h2>
      )}
      {children}
    </div>
  );
}
