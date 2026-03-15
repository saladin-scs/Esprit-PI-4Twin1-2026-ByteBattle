/**
 * Code splitting: lazy loading des pages avec Suspense.
 */
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('../../pages/Home/Home').then((m) => ({ default: m.default })));
const Login = lazy(() => import('../../pages/Auth/Login').then((m) => ({ default: m.default })));
const Register = lazy(() => import('../../pages/Auth/Register').then((m) => ({ default: m.default })));
const Challenges = lazy(() => import('../../pages/Challenges/Challenges').then((m) => ({ default: m.default })));
const ChallengeDetail = lazy(() => import('../../pages/Challenges/ChallengeDetail').then((m) => ({ default: m.default })));
const Dashboard = lazy(() => import('../../pages/Dashboard/Dashboard').then((m) => ({ default: m.default })));
const Leaderboard = lazy(() => import('../../pages/Leaderboard/Leaderboard').then((m) => ({ default: m.default })));
const Competitions = lazy(() => import('../../pages/Competitions/Competitions').then((m) => ({ default: m.default })));
const ProfileSettings = lazy(() => import('../../pages/Settings/Profile').then((m) => ({ default: m.default })));
const SecuritySettings = lazy(() => import('../../pages/Settings/Security').then((m) => ({ default: m.default })));
const PublicProfile = lazy(() => import('../../pages/User/PublicProfile').then((m) => ({ default: m.default })));
const AdminUsers = lazy(() => import('../../pages/Admin/Users').then((m) => ({ default: m.default })));
const AdminGamificationStats = lazy(() => import('../../pages/Admin/GamificationStats').then((m) => ({ default: m.default })));
const VerifyEmail = lazy(() => import('../../pages/Auth/VerifyEmail').then((m) => ({ default: m.default })));
const ForgotPassword = lazy(() => import('../../pages/Auth/ForgotPassword').then((m) => ({ default: m.default })));
const ResetPassword = lazy(() => import('../../pages/Auth/ResetPassword').then((m) => ({ default: m.default })));
const SocialCallback = lazy(() => import('../../pages/Auth/SocialCallback').then((m) => ({ default: m.default })));
const Setup2FA = lazy(() => import('../../pages/Auth/Setup2FA').then((m) => ({ default: m.default })));

export const LazyRoutes = {
  Home,
  Login,
  Register,
  Challenges,
  ChallengeDetail,
  Dashboard,
  Leaderboard,
  Competitions,
  ProfileSettings,
  SecuritySettings,
  PublicProfile,
  AdminUsers,
  AdminGamificationStats,
  VerifyEmail,
  ForgotPassword,
  ResetPassword,
  SocialCallback,
  Setup2FA,
};

const PageFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
  </div>
);

export function SuspensePageFallback() {
  return <PageFallback />;
}

export function withSuspense<P extends object>(Component: React.ComponentType<P>) {
  return function LazyWithSuspense(props: P) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
}
