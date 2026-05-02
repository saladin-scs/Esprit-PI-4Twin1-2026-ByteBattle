import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { HeaderBrand } from './HeaderBrand';
import { HeaderNav } from './HeaderNav';
import { HeaderActions } from './HeaderActions';
import { HeaderMobileMenu } from './HeaderMobileMenu';
import { ChatNavHint } from './ChatNavHint';

export function Header() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/80 shadow-header"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-4 sm:gap-8">
            <HeaderBrand />
            <HeaderNav />
            {isAuthenticated && (
              <div className="hidden sm:block">
                <ChatNavHint />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <HeaderActions />
            </div>
            <HeaderMobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
