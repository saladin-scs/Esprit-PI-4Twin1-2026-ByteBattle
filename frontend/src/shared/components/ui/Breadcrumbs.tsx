import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1 text-sm ${className}`}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={`${item.label}-${idx}`} className="inline-flex items-center gap-1">
            {item.to && !isLast ? (
              <Link className="bb-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded px-1" to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span className="px-1 font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
            )}
            {!isLast ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden /> : null}
          </span>
        );
      })}
    </nav>
  );
}

