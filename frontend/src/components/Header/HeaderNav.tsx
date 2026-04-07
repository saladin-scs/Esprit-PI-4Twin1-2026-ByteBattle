import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const navLinks = [
  { to: '/explore', label: 'Explore', authOnly: false },
  { to: '/challenges', label: 'Challenges', authOnly: true },
  { to: '/competitions', label: 'Competitions', authOnly: true },
  { to: '/history', label: 'Historique', authOnly: true },
  { to: '/leaderboard', label: 'Leaderboard', authOnly: true },
  { to: '/reclamation', label: 'Reports', authOnly: true },
] as const;

const linkClass =
  'px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors';

export function HeaderNav() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  return (
    <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-1">
      {navLinks.filter((l) => !l.authOnly || isAuthenticated).map(({ to, label }) => (
        <Link key={to} to={to} className={linkClass}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
