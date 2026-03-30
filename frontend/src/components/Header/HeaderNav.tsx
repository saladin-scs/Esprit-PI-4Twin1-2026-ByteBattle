import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const navLinks = [
  { to: '/explore', label: 'Explore', authOnly: false },
  { to: '/challenges', label: 'Challenges', authOnly: true },
  { to: '/competitions', label: 'Competitions', authOnly: true },
  { to: '/leaderboard', label: 'Leaderboard', authOnly: true },
  { to: '/reclamation', label: 'Réclamation', authOnly: true },
] as const;

const linkClass =
  'px-3 py-2 text-sm font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors';

export function HeaderNav() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  return (
    <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-1">
      {navLinks.filter((l) => !l.authOnly || isAuthenticated).map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `${linkClass} ${
              isActive
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-900 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-blue-400'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
