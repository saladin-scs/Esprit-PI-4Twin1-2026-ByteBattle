import React, { useState } from 'react';
import axios from 'axios';
import './PerformancePredictor.css';

interface PredictionResult {
  userId: string;
  challengeId: string;
  successProbability: number;
  difficulty: number;
  estimatedTime: number;
  confidence: number;
}

interface PredictionRequest {
  userId: string;
  challengeId: string;
  userFeatures: Record<string, number>;
  challengeFeatures: Record<string, number>;
}

export const PerformancePredictor: React.FC = () => {
  const [formData, setFormData] = useState<PredictionRequest>({
    userId: '',
    challengeId: '',
    userFeatures: {
      skillRating: 1500,
      challengesCompleted: 50,
      successRate: 0.75,
    },
    challengeFeatures: {
      difficulty_level: 5.0,
      timeLimit: 120,
    },
  });

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFeatureChange = (feature: string, type: 'user' | 'challenge', value: number) => {
    setFormData((prev) => ({
      ...prev,
      [type === 'user' ? 'userFeatures' : 'challengeFeatures']: {
        ...prev[type === 'user' ? 'userFeatures' : 'challengeFeatures'],
        [feature]: value,
      },
    }));
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const response = await axios.post<PredictionResult>(
        '/api/ml/predict-performance',
        formData,
      );
      setPrediction(response.data);
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 0.8) return '#51cf66'; // Green
    if (probability >= 0.6) return '#ffd43b'; // Yellow
    if (probability >= 0.4) return '#ff922b'; // Orange
    return '#ff6b6b'; // Red
  };

  return (
    <div className="predictor-container">
      <div className="predictor-header">
        <h1>Performance Predictor</h1>
        <p>Estimate your success probability on challenges</p>
      </div>

      <div className="predictor-content">
        {/* Input Section */}
        <div className="input-section">
          <h2>Challenge Information</h2>

          <div className="input-row">
            <div className="input-group">
              <label>Your User ID</label>
              <input
                type="text"
                name="userId"
                value={formData.userId}
                onChange={handleInputChange}
                placeholder="e.g., user_123"
              />
            </div>
            <div className="input-group">
              <label>Challenge ID</label>
              <input
                type="text"
                name="challengeId"
                value={formData.challengeId}
                onChange={handleInputChange}
                placeholder="e.g., ch_456"
              />
            </div>
          </div>

          <h3>Your Profile</h3>
          <div className="features-grid">
            <div className="feature-input">
              <label>Skill Rating</label>
              <input
                type="number"
                value={formData.userFeatures.skillRating}
                onChange={(e) => handleFeatureChange('skillRating', 'user', Number(e.target.value))}
              />
              <span className="feature-value">{formData.userFeatures.skillRating}</span>
            </div>
            <div className="feature-input">
              <label>Challenges Completed</label>
              <input
                type="number"
                value={formData.userFeatures.challengesCompleted}
                onChange={(e) =>
                  handleFeatureChange('challengesCompleted', 'user', Number(e.target.value))
                }
              />
              <span className="feature-value">{formData.userFeatures.challengesCompleted}</span>
            </div>
            <div className="feature-input">
              <label>Success Rate</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formData.userFeatures.successRate}
                onChange={(e) =>
                  handleFeatureChange('successRate', 'user', Number(e.target.value))
                }
              />
              <span className="feature-value">
                {(formData.userFeatures.successRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <h3>Challenge Details</h3>
          <div className="features-grid">
            <div className="feature-input">
              <label>Difficulty Level</label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={formData.challengeFeatures.difficulty_level}
                onChange={(e) =>
                  handleFeatureChange('difficulty_level', 'challenge', Number(e.target.value))
                }
              />
              <span className="feature-value">
                {formData.challengeFeatures.difficulty_level.toFixed(1)}/10
              </span>
            </div>
            <div className="feature-input">
              <label>Time Limit (minutes)</label>
              <input
                type="number"
                value={formData.challengeFeatures.timeLimit}
                onChange={(e) => handleFeatureChange('timeLimit', 'challenge', Number(e.target.value))}
              />
              <span className="feature-value">{formData.challengeFeatures.timeLimit} min</span>
            </div>
          </div>

          <button
            className="btn-predict"
            onClick={handlePredict}
            disabled={loading || !formData.userId || !formData.challengeId}
          >
            {loading ? 'Predicting...' : 'Predict Performance'}
          </button>
        </div>

        {/* Result Section */}
        {prediction && (
          <div className="result-section">
            <h2>Prediction Results</h2>

            <div className="result-card main-result">
              <div className="probability-display">
                <div className="probability-circle">
                  <svg viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#eee"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={getSuccessColor(prediction.successProbability)}
                      strokeWidth="8"
                      strokeDasharray={`${prediction.successProbability * 283} 283`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="probability-text">
                    <span className="percentage">
                      {(prediction.successProbability * 100).toFixed(0)}%
                    </span>
                    <span className="label">Success Rate</span>
                  </div>
                </div>

                <div className="prediction-details">
                  <div className="detail-item">
                    <span className="detail-label">Difficulty Rating</span>
                    <span className="detail-value">{prediction.difficulty?.toFixed(1)}/10</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Estimated Time</span>
                    <span className="detail-value">{prediction.estimatedTime} minutes</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Model Confidence</span>
                    <span className="detail-value">{(prediction.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className="recommendation">
                {prediction.successProbability >= 0.8 && (
                  <p className="rec-high">✅ Highly recommended! You should be well-prepared for this challenge.</p>
                )}
                {prediction.successProbability >= 0.6 && prediction.successProbability < 0.8 && (
                  <p className="rec-medium">
                    ⚠️ Good match. You have a reasonable chance of success. Review the topic beforehand.
                  </p>
                )}
                {prediction.successProbability < 0.6 && (
                  <p className="rec-low">
                    📚 Consider sharpening your skills first. This challenge might be a good learning opportunity.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformancePredictor;
