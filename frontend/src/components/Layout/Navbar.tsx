import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { RootState } from '../../store/store';
import { Button } from '../../shared/components';
import { ThemeToggle } from '../../shared/components/ThemeToggle';

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const isAdmin = !!user?.roles?.includes('admin');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const linkClass = 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium';

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              ByteBattle
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link to="/challenges" className={linkClass}>
                Défis
              </Link>
              <Link to="/competitions" className={linkClass}>
                Compétitions
              </Link>
              <Link to="/leaderboard" className={linkClass}>
                Classement
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className={linkClass}>Dashboard</Link>
                <Link to="/settings/profile" className={linkClass}>Paramètres</Link>
                {isAdmin && (
                  <Link to="/admin/users" className={linkClass}>Admin</Link>
                )}
                <Link to={`/u/${user?.username}`} className={linkClass}>{user?.username}</Link>
                <Button variant="danger" onClick={handleLogout} className="!py-1.5">
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass}>Connexion</Link>
                <Link to="/register">
                  <Button className="!py-1.5">S’inscrire</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

