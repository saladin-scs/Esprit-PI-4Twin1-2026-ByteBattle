import { ReactNode, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Header } from '../Header';
import Footer from './Footer';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe, logout } from '../../store/slices/authSlice';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { token, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe()).unwrap().catch(() => {
        dispatch(logout());
      });
    }
  }, [token, user, dispatch]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;

