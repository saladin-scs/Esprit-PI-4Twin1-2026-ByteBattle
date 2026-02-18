import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Challenges from './pages/Challenges/Challenges';
import ChallengeDetail from './pages/Challenges/ChallengeDetail';
import Dashboard from './pages/Dashboard/Dashboard';
import Leaderboard from './pages/Leaderboard/Leaderboard';
import Competitions from './pages/Competitions/Competitions';
import ProfileSettings from './pages/Settings/Profile';
import SecuritySettings from './pages/Settings/Security';
import PublicProfile from './pages/User/PublicProfile';
import AdminUsers from './pages/Admin/Users';
import VerifyEmail from './pages/Auth/VerifyEmail';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/challenges/:id" element={<ChallengeDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/settings/profile" element={<ProfileSettings />} />
        <Route path="/settings/security" element={<SecuritySettings />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Routes>
    </Layout>
  );
}

export default App;

