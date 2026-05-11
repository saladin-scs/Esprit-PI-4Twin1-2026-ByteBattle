import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './UserAnalyticsDashboard.css';

interface PerformanceMetrics {
  successRate: number;
  averageDifficulty: number;
  skillLevel: string;
  improvementTrend: string;
  recommendedFocusAreas: string[];
}

interface SimilarUser {
  user_id: string;
  similarity: number;
}

interface AnalyticsData {
  userId: string;
  metrics: PerformanceMetrics;
  skillCluster: number;
  similarUsers: SimilarUser[];
}

export const UserAnalyticsDashboard: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [daysPeriod, setDaysPeriod] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [userId, daysPeriod]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.post<AnalyticsData>(
        `/api/ml/analytics/user`,
        {
          userId,
          daysPeriod,
        },
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSkillColor = (skill: string) => {
    const colors: { [key: string]: string } = {
      Beginner: '#ff6b6b',
      Intermediate: '#ffd43b',
      Advanced: '#51cf66',
      Expert: '#845ef7',
    };
    return colors[skill] || '#666';
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="analytics-error">Failed to load analytics</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h1>Your Performance Analytics</h1>
        <div className="period-selector">
          <select value={daysPeriod} onChange={(e) => setDaysPeriod(Number(e.target.value))}>
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={365}>Last Year</option>
          </select>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Main Metrics */}
        <div className="metrics-section">
          <div className="metric-card large">
            <h3>Skill Level</h3>
            <div className="skill-badge" style={{ borderColor: getSkillColor(analytics.metrics.skillLevel) }}>
              <span className="skill-text">{analytics.metrics.skillLevel}</span>
              <span className="cluster-badge">Cluster {analytics.skillCluster}</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>Success Rate</h3>
            <div className="metric-value">{(analytics.metrics.successRate * 100).toFixed(1)}%</div>
            <div className="metric-bar">
              <div
                className="metric-fill"
                style={{ width: `${analytics.metrics.successRate * 100}%` }}
              />
            </div>
          </div>

          <div className="metric-card">
            <h3>Avg. Difficulty</h3>
            <div className="metric-value">{analytics.metrics.averageDifficulty.toFixed(1)}/10</div>
            <div className="metric-bar">
              <div
                className="metric-fill"
                style={{ width: `${(analytics.metrics.averageDifficulty / 10) * 100}%` }}
              />
            </div>
          </div>

          <div className="metric-card">
            <h3>Improvement Trend</h3>
            <div className={`trend-badge ${analytics.metrics.improvementTrend.toLowerCase()}`}>
              {analytics.metrics.improvementTrend}
            </div>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="focus-section">
          <h2>Recommended Focus Areas</h2>
          <div className="focus-list">
            {analytics.metrics.recommendedFocusAreas.map((area, idx) => (
              <div key={idx} className="focus-item">
                <span className="focus-icon">📚</span>
                <span className="focus-text">{area}</span>
                <span className="focus-badge">Improve +15%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Similar Users */}
        <div className="similar-users-section">
          <h2>Similar Users</h2>
          <div className="similar-users-list">
            {analytics.similarUsers.map((user, idx) => (
              <div key={idx} className="similar-user-item">
                <div className="user-avatar">
                  <span>{user.user_id.substring(0, 1).toUpperCase()}</span>
                </div>
                <div className="user-info">
                  <span className="user-name">{user.user_id}</span>
                  <div className="similarity-bar">
                    <div className="similarity-fill" style={{ width: `${user.similarity * 100}%` }} />
                  </div>
                </div>
                <span className="similarity-score">{(user.similarity * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="dashboard-actions">
        <button className="btn-primary">View Detailed Report</button>
        <button className="btn-secondary">Download Statistics</button>
        <button className="btn-secondary">Compare with Peers</button>
      </div>
    </div>
  );
};

export default UserAnalyticsDashboard;
