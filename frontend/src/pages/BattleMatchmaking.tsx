import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './BattleMatchmaking.css';

interface MatchSuggestion {
  opponentId: string;
  compatibilityScore: number;
  reason: string;
}

interface MatchmakingData {
  userId: string;
  suggestions: MatchSuggestion[];
}

export const BattleMatchmaking: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchupSuggestions();
  }, [userId]);

  const fetchMatchupSuggestions = async () => {
    setLoading(true);
    try {
      // Mock data for now - in production this would call /api/ml/matchup-suggestions
      const mockData: MatchmakingData = {
        userId: userId || 'user_123',
        suggestions: [
          {
            opponentId: 'user_456',
            compatibilityScore: 0.92,
            reason: 'Similar skill level and experience',
          },
          {
            opponentId: 'user_789',
            compatibilityScore: 0.88,
            reason: 'Complementary strengths and weaknesses',
          },
          {
            opponentId: 'user_321',
            compatibilityScore: 0.85,
            reason: 'Good balanced matchup',
          },
        ],
      };
      setSuggestions(mockData.suggestions);
    } catch (error) {
      console.error('Failed to fetch matchup suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const startBattle = (opponentId: string) => {
    setSelectedOpponent(opponentId);
    console.log(`Starting battle between ${userId} and ${opponentId}`);
    // Navigate to battle page
  };

  return (
    <div className="matchmaking-container">
      <div className="matchmaking-header">
        <h1>Find Your Battle Opponent</h1>
        <p className="subtitle">AI-powered matchmaking based on skill similarity</p>
      </div>

      {loading ? (
        <div className="loading">Finding perfect opponents...</div>
      ) : (
        <div className="suggestions-container">
          {suggestions.map((suggestion, idx) => (
            <div key={idx} className="opponent-card">
              <div className="opponent-header">
                <div className="opponent-avatar">
                  <span>{suggestion.opponentId.substring(0, 1).toUpperCase()}</span>
                </div>
                <div className="opponent-info">
                  <h3>{suggestion.opponentId}</h3>
                  <p className="reason">{suggestion.reason}</p>
                </div>
                <div className="compatibility">
                  <span className="compatibility-text">Compatibility</span>
                  <div className="compatibility-circle">
                    <div className="compatibility-value">
                      {(suggestion.compatibilityScore * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="opponent-footer">
                <button
                  className="btn-challenge"
                  onClick={() => startBattle(suggestion.opponentId)}
                  disabled={selectedOpponent === suggestion.opponentId}
                >
                  {selectedOpponent === suggestion.opponentId ? 'Starting Battle...' : 'Challenge'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="matchmaking-actions">
        <button onClick={fetchMatchupSuggestions} className="btn-refresh">
          Find More Opponents
        </button>
      </div>
    </div>
  );
};

export default BattleMatchmaking;
