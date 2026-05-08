import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-2 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>&copy; Twin Code Vision 2026 ByteBattle. All rights reserved.</p>
        <span className="hidden sm:inline" aria-hidden>
          ·
        </span>
        <Link to="/status" className="text-primary-600 hover:underline dark:text-primary-400">
          Statut API
        </Link>
      </div>
    </footer>
  );
}

export default Footer;

