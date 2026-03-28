import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Button } from '../../shared/components';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { UserMenu } from './UserMenu';
import { ChatNavHint } from './ChatNavHint';

const navLinks = [
  { to: '/challenges', label: 'Challenges', authOnly: true },
  { to: '/competitions', label: 'Competitions', authOnly: true },
  { to: '/leaderboard', label: 'Leaderboard', authOnly: true },
  { to: '/reclamation', label: 'Réclamation', authOnly: true },
] as const;

export function HeaderMobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={open}
        aria-label="Open menu"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40 top-14 sm:top-16"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 left-0 top-full z-40 mt-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-3 shadow-dropdown"
            >
              <nav className="flex flex-col gap-1 px-4">
                {navLinks.filter((l) => !l.authOnly || isAuthenticated).map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                  >
                    {label}
                  </Link>
                ))}
                {isAuthenticated && (
                  <div className="px-3 py-2">
                    <ChatNavHint />
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                  <ThemeToggle />
                  {isAuthenticated ? (
                    <UserMenu />
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Log in
                      </Link>
                      <Link to="/register" onClick={() => setOpen(false)}>
                        <Button className="!py-1.5">Sign up</Button>
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
