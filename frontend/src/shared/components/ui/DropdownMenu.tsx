import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface DropdownMenuProps {
  /** Trigger element (e.g. button or avatar). */
  trigger: ReactNode;
  /** Whether the dropdown is open (controlled). */
  open: boolean;
  /** Called when open state should change (e.g. toggle). */
  onOpenChange: (open: boolean) => void;
  /** Menu content (list of items). */
  children: ReactNode;
  /** Alignment: 'start' | 'end' (relative to trigger). */
  align?: 'start' | 'end';
  /** Optional class for the dropdown panel. */
  className?: string;
}

const animation = {
  initial: { opacity: 0, y: -6, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.96 },
  transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] },
};

export function DropdownMenu({
  trigger,
  open,
  onOpenChange,
  children,
  align = 'end',
  className = '',
}: DropdownMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) onOpenChange(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenChange(!open);
          }
        }}
      >
        {trigger}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="menu"
            {...animation}
            className={`
              absolute z-50 mt-2 min-w-[12rem] rounded-xl border border-gray-200 dark:border-gray-600
              bg-white dark:bg-gray-800 shadow-dropdown
              py-1
              ${align === 'end' ? 'right-0' : 'left-0'}
              ${className}
            `}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  /** SPA route; when set, renders as Link and closes menu on navigate. */
  to?: string;
  href?: string;
  className?: string;
  icon?: ReactNode;
}

export function DropdownMenuItem({
  children,
  onClick,
  to,
  href,
  className = '',
  icon,
}: DropdownMenuItemProps) {
  const baseClass = `
    w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium
    text-gray-700 dark:text-gray-200
    hover:bg-gray-100 dark:hover:bg-gray-700/80
    focus:bg-gray-100 dark:focus:bg-gray-700/80 focus:outline-none
    transition-colors
    ${className}
  `;
  const content = (
    <>
      {icon && <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">{icon}</span>}
      {children}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={baseClass} role="menuitem">
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={baseClass} role="menuitem" target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={baseClass} role="menuitem">
      {content}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-gray-200 dark:bg-gray-600" role="separator" />;
}
