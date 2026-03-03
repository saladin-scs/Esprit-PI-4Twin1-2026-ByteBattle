import { Link } from 'react-router-dom';

export function HeaderBrand() {
  return (
    <Link
      to="/"
      className="flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-md transition-opacity hover:opacity-90"
    >
      <img
        src="/bytebattle-logo.png"
        alt="Byte Battle"
        className="h-12 w-auto origin-center"
        style={{ transform: 'rotate(-10deg)' }}
      />
    </Link>
  );
}
