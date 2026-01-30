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

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/challenges/:id" element={<ChallengeDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/competitions" element={<Competitions />} />
      </Routes>
    </Layout>
  );
}

export default App;

