import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './ChallengeRecommendations.css';

interface Recommendation {
  challengeId: string;
  challengeName: string;
  score: number;
  difficulty: string;
  reason: string;
  estimatedSuccessRate?: number;
}

interface RecommendationResponse {
  userId: string;
  recommendations: Recommendation[];
  generatedAt: string;
}

export const ChallengeRecommendations: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<RecommendationResponse>(
        `/api/ml/recommendations`,
        {
          userId,
          count: 5,
        },
      );
      setRecommendations(response.data.recommendations);
    } catch (err) {
      setError('Failed to load recommendations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: { [key: string]: string } = {
      Easy: 'bg-green-100 text-green-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      Hard: 'bg-red-100 text-red-800',
      Expert: 'bg-purple-100 text-purple-800',
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h1>Recommended Challenges for You</h1>
        <p className="subtitle">Based on your performance and similar users</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-spinner">Loading recommendations...</div>
      ) : (
        <div className="recommendations-grid">
          {recommendations.length === 0 ? (
            <p className="no-recommendations">No recommendations available yet</p>
          ) : (
            recommendations.map((rec, idx) => (
              <div key={idx} className="recommendation-card">
                <div className="card-header">
                  <h3>{rec.challengeName}</h3>
                  <span className={`difficulty-badge ${getDifficultyColor(rec.difficulty)}`}>
                    {rec.difficulty}
                  </span>
                </div>

                <div className="card-body">
                  <p className="reason">{rec.reason}</p>

                  <div className="stats">
                    <div className="stat">
                      <span className="label">Recommendation Score</span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${(rec.score / 100) * 100}%` }}
                        />
                      </div>
                      <span className="value">{rec.score.toFixed(2)}</span>
                    </div>

                    {rec.estimatedSuccessRate !== undefined && (
                      <div className="stat">
                        <span className="label">Estimated Success Rate</span>
                        <span className="value">{(rec.estimatedSuccessRate * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-footer">
                  <button className="btn-start">Start Challenge</button>
                  <button className="btn-view">View Details</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="refresh-section">
        <button onClick={fetchRecommendations} disabled={loading} className="btn-refresh">
          {loading ? 'Loading...' : 'Refresh Recommendations'}
        </button>
      </div>
    </div>
  );
};

export default ChallengeRecommendations;
