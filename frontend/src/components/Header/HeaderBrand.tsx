import { Link } from 'react-router-dom';
import { ByteBattleLogo } from '../ByteBattleLogo';

export function HeaderBrand() {
  return (
    <Link
      to="/"
      className="flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-md transition-opacity hover:opacity-90"
    >
      <ByteBattleLogo className="h-12 w-auto origin-center" />
    </Link>
  );
}
