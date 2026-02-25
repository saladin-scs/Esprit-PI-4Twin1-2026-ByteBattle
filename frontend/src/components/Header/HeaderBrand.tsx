import { Link } from 'react-router-dom';

export function HeaderBrand() {
  return (
    <Link
      to="/"
      className="flex items-center text-xl font-bold tracking-tight text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-md transition-colors"
    >
      ByteBattle
    </Link>
  );
}
