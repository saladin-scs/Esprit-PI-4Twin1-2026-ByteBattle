import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ChallengeRecommendations from '../../pages/ChallengeRecommendations';
import UserAnalyticsDashboard from '../../pages/UserAnalyticsDashboard';
import BattleMatchmaking from '../../pages/BattleMatchmaking';
import PerformancePredictor from '../../pages/PerformancePredictor';

export const MLRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="predictor" replace />} />
      <Route path="recommendations/:userId" element={<ChallengeRecommendations />} />
      <Route path="analytics/:userId" element={<UserAnalyticsDashboard />} />
      <Route path="matchmaking/:userId" element={<BattleMatchmaking />} />
      <Route path="predictor" element={<PerformancePredictor />} />
      <Route path="*" element={<Navigate to="predictor" replace />} />
    </Routes>
  );
};

export default MLRoutes;
