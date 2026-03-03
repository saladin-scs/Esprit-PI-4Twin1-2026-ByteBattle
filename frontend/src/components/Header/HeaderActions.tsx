import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Button } from '../../shared/components';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { UserMenu } from './UserMenu';

const linkClass =
  'px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors';

export function HeaderActions() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {isAuthenticated ? (
        <UserMenu />
      ) : (
        <>
          <Link to="/login" className={linkClass}>
            Log in
          </Link>
          <Link to="/register">
            <Button className="!py-1.5">Sign up</Button>
          </Link>
        </>
      )}
    </div>
  );
}
