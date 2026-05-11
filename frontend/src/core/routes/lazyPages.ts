/**
 * Lazy-loaded route pages only (no JSX).
 * Kept separate from Suspense helpers so React Fast Refresh can track exports cleanly.
 */
import { lazy } from 'react';

export const Home = lazy(() => import('../../pages/Home/Home').then((m) => ({ default: m.default })));
export const Login = lazy(() => import('../../pages/Auth/Login').then((m) => ({ default: m.default })));
export const Register = lazy(() => import('../../pages/Auth/Register').then((m) => ({ default: m.default })));
export const Challenges = lazy(() => import('../../pages/Challenges/Challenges').then((m) => ({ default: m.default })));
export const ChallengeDetail = lazy(() =>
  import('../../pages/Challenges/ChallengeDetail').then((m) => ({ default: m.default })),
);
export const Dashboard = lazy(() => import('../../pages/Dashboard/Dashboard').then((m) => ({ default: m.default })));
export const Leaderboard = lazy(() => import('../../pages/Leaderboard/Leaderboard').then((m) => ({ default: m.default })));
export const Explore = lazy(() => import('../../pages/Explore/Explore').then((m) => ({ default: m.default })));
export const Status = lazy(() => import('../../pages/Status/Status').then((m) => ({ default: m.default })));
export const Reclamation = lazy(() =>
  import('../../modules/reclamation/ReclamationScreen').then((m) => ({ default: m.ReclamationScreen })),
);
export const Competitions = lazy(() => import('../../pages/Competitions/Competitions').then((m) => ({ default: m.default })));
export const CompetitionDetail = lazy(() =>
  import('../../pages/Competitions/CompetitionDetail').then((m) => ({ default: m.default })),
);
export const ProfileSettings = lazy(() => import('../../pages/Settings/Profile').then((m) => ({ default: m.default })));
export const SecuritySettings = lazy(() => import('../../pages/Settings/Security').then((m) => ({ default: m.default })));
export const DeveloperSettings = lazy(() =>
  import('../../pages/Settings/Developer').then((m) => ({ default: m.default })),
);
export const AdminUsers = lazy(() => import('../../pages/Admin/Users').then((m) => ({ default: m.default })));
export const AdminGamificationStats = lazy(() =>
  import('../../pages/Admin/GamificationStats').then((m) => ({ default: m.default })),
);
export const AdminCompetitions = lazy(() =>
  import('../../pages/Admin/Competitions').then((m) => ({ default: m.default })),
);
export const AdminChallenges = lazy(() => import('../../pages/Admin/Challenges').then((m) => ({ default: m.default })));
export const AdminReclamations = lazy(() =>
  import('../../pages/Admin/Reclamations').then((m) => ({ default: m.default })),
);
export const VerifyEmail = lazy(() => import('../../pages/Auth/VerifyEmail').then((m) => ({ default: m.default })));
export const ForgotPassword = lazy(() =>
  import('../../pages/Auth/ForgotPassword').then((m) => ({ default: m.default })),
);
export const ResetPassword = lazy(() => import('../../pages/Auth/ResetPassword').then((m) => ({ default: m.default })));
export const SocialCallback = lazy(() =>
  import('../../pages/Auth/SocialCallback').then((m) => ({ default: m.default })),
);
export const Setup2FA = lazy(() => import('../../pages/Auth/Setup2FA').then((m) => ({ default: m.default })));
export const PublicProfile = lazy(() => import('../../pages/User/PublicProfile').then((m) => ({ default: m.default })));
export const BattleMatchmaking = lazy(() =>
  import('../../pages/Battle/MatchmakingPage').then((m) => ({ default: m.default })),
);
export const BattleRoom = lazy(() => import('../../pages/Battle/BattlePage').then((m) => ({ default: m.default })));
export const BattleResult = lazy(() =>
  import('../../pages/Battle/BattleResultPage').then((m) => ({ default: m.default })),
);
