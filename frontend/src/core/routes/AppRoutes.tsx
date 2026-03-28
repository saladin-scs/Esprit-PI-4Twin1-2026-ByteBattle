/**
 * Définition centralisée des routes – une seule source de vérité.
 * Code splitting: lazy loading des pages avec Suspense.
 */
import { Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import Layout from '../../components/Layout/Layout';
import { AdminRoute } from '../../components/guards/AdminRoute';
import { ProtectedRoute } from '../../shared/components';
import { LazyRoutes, SuspensePageFallback } from './lazyRoutes';

const {
  Home,
  Login,
  Register,
  Challenges,
  ChallengeDetail,
  Dashboard,
  Leaderboard,
  Competitions,
  CompetitionDetail,
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
  Status,
} = LazyRoutes;

export function AppRoutes() {
  return (
    <Layout>
      <Suspense fallback={<SuspensePageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/status" element={<Status />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/setup-2fa" element={<Setup2FA />} />
          <Route path="/auth/social/callback" element={<SocialCallback />} />
          <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
          <Route path="/challenges/:id" element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/competitions" element={<ProtectedRoute><Competitions /></ProtectedRoute>} />
          <Route path="/competitions/:id" element={<ProtectedRoute><CompetitionDetail /></ProtectedRoute>} />
          <Route path="/settings/profile" element={<ProfileSettings />} />
          <Route path="/settings/security" element={<SecuritySettings />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/gamification" element={<AdminRoute><AdminGamificationStats /></AdminRoute>} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
