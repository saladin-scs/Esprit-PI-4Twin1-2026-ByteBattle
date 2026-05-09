# ByteBattle ML Integration Guide

## Overview

This document provides a comprehensive guide for the ML/AI features integrated into the ByteBattle platform. The integration includes:

- **Performance Prediction**: ML models predict user success probability on challenges
- **Smart Recommendations**: Collaborative filtering suggests personalized challenges
- **Intelligent Matchmaking**: Skill-based opponent matching for fair battles
- **User Analytics**: Comprehensive performance analytics and insights
- **Clustering**: User segmentation for skill-based grouping

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  - Recommendations Page                                      │
│  - Analytics Dashboard                                       │
│  - Matchmaking Interface                                     │
│  - Performance Predictor                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                    API Calls
                         │
┌────────────────────────▼────────────────────────────────────┐
│                Backend (NestJS)                              │
│  - ML Controller                                             │
│  - ML Service                                                │
│  - HTTP Client to AI Service                                 │
│  - Database Models (MongoDB)                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP Requests
                         │
┌────────────────────────▼────────────────────────────────────┐
│              AI Service (FastAPI)                            │
│  - Data Processor                                            │
│  - ML Models (Random Forest, SVM, etc)                       │
│  - Recommendation Engine                                     │
│  - Clustering Algorithm                                      │
│  - Analytics Engine                                          │
└─────────────────────────────────────────────────────────────┘
```

## Installation & Setup

### 1. Environment Variables

Create/update `.env` files:

#### Backend (`.env` or `.env.local`)
```bash
# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/bytebattle?authSource=admin

# AI Service
AI_SERVICE_URL=http://localhost:8001
# Or in Docker: http://bytebattle-ai-service:8001

# Features
ENABLE_PREDICTIONS=true
ENABLE_RECOMMENDATIONS=true
ENABLE_MATCHMAKING=true
ENABLE_ANALYTICS=true
```

#### Frontend (`.env`)
```bash
VITE_API_URL=http://localhost:3000
VITE_AI_API_URL=http://localhost:8001
```

### 2. Docker Setup

```bash
# Build and run all services
docker-compose up -d

# Check service health
docker-compose ps

# View AI service logs
docker-compose logs bytebattle-ai-service

# View backend logs
docker-compose logs bytebattle-backend
```

### 3. Manual Setup (Without Docker)

#### AI Service
```bash
cd bytebattle-ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

#### Backend
```bash
cd backend
npm install
npm run start:dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Predictions

```
POST /api/ml/predict-performance
{
  "userId": "user_123",
  "challengeId": "ch_456",
  "userFeatures": {
    "skillRating": 1500,
    "challengesCompleted": 50
  },
  "challengeFeatures": {
    "difficulty_level": 5.0,
    "timeLimit": 120
  }
}

Response:
{
  "userId": "user_123",
  "challengeId": "ch_456",
  "successProbability": 0.78,
  "difficulty": 5.0,
  "estimatedTimeMinutes": 45,
  "confidence": 0.92
}
```

### Recommendations

```
POST /api/ml/recommendations
{
  "userId": "user_123",
  "count": 5,
  "difficulty": "Medium"
}

Response:
{
  "userId": "user_123",
  "recommendations": [
    {
      "challengeId": "ch_789",
      "challengeName": "Binary Tree Traversal",
      "score": 0.95,
      "difficulty": "Medium",
      "reason": "Based on similar users' performance"
    }
  ]
}
```

### Matchmaking

```
POST /api/ml/matchup-suggestions
{
  "userId": "user_123",
  "userFeatures": { "skillRating": 1500 },
  "availableUsers": ["user_456", "user_789", "user_321"],
  "count": 3
}

Response:
{
  "userId": "user_123",
  "suggestions": [
    {
      "opponentId": "user_456",
      "compatibilityScore": 0.92,
      "reason": "Similar skill level"
    }
  ]
}
```

### Analytics

```
POST /api/ml/analytics/user
{
  "userId": "user_123",
  "daysPeriod": 30
}

Response:
{
  "userId": "user_123",
  "metrics": {
    "successRate": 0.72,
    "skillLevel": "Intermediate",
    "improvementTrend": "Positive"
  },
  "skillCluster": 1,
  "similarUsers": [...]
}
```

## Frontend Usage

### Using Hooks

```typescript
import { 
  useRecommendations, 
  usePerformancePrediction,
  useMatchmaking,
  useUserAnalytics 
} from '@/hooks/useML';

// In component
const { recommendations, loading, getRecommendations } = useRecommendations();

useEffect(() => {
  getRecommendations('user_123', 5);
}, []);

// Render recommendations
{recommendations.map(rec => (
  <div key={rec.challengeId}>
    {rec.challengeName} - {rec.difficulty}
  </div>
))}
```

### Using API Directly

```typescript
import mlAPI from '@/services/mlAPI';

// Get recommendations
const result = await mlAPI.recommendation.getChallengeRecommendations(
  'user_123',
  5,
  'Medium'
);

// Get analytics
const analytics = await mlAPI.analytics.getUserAnalytics('user_123', 30);
```

## Database Schema

### Collections

#### 1. UserMLProfile
```typescript
{
  userId: string;           // User ID (unique)
  skillRating: number;      // Skill rating
  skillCluster: number;     // Cluster assignment
  challengesCompleted: number;
  embeddings: number[];     // PCA embeddings for similarity
  lastUpdated: Date;
}
```

#### 2. PerformancePrediction
```typescript
{
  userId: string;
  challengeId: string;
  predictedSuccessProbability: number;
  modelUsed: string;        // 'rf', 'svm', 'dt', 'lr', 'mlp'
  actualSuccess?: boolean;  // Filled after challenge completion
  predictedAt: Date;
}
```

#### 3. ChallengeRecommendation
```typescript
{
  userId: string;
  challengeId: string;
  score: number;
  reason: string;
  completed: boolean;
  clicked: boolean;
  recommendedAt: Date;
}
```

## Machine Learning Models

The AI service includes multiple trained models:

| Model | Use Case | Accuracy |
|-------|----------|----------|
| **Random Forest** | Primary predictions | ~92% |
| **SVM (RBF)** | Non-linear patterns | ~90% |
| **Decision Tree** | Interpretability | ~88% |
| **Logistic Regression** | Baseline | ~86% |
| **MLP (Neural Network)** | Complex patterns | ~89% |

### Model Training

Models are trained from Codeforces dataset with:
- 306,000+ user-contest interactions
- 5+ key features per user
- Cross-validation for robustness
- Anti-overfitting measures (regularization, early stopping)

## Troubleshooting

### AI Service Not Connecting

```bash
# Check if service is running
curl http://localhost:8001/health

# Check logs
docker-compose logs bytebattle-ai-service

# Verify network
docker network ls
docker network inspect bytebattle-network
```

### Slow Predictions

- AI service runs on CPU by default
- For production, consider GPU acceleration
- Batch predictions available for high-volume requests

### Model Performance Low

- Ensure sufficient training data
- Check feature values are normalized
- Verify model is not overfitting
- Consider retraining with fresh data

## Production Deployment

### Requirements

- Python 3.9+
- Node.js 18+
- MongoDB 5.0+
- 4GB+ RAM
- 10GB+ disk storage

### Recommendations

1. **Enable HTTPS** for all API calls
2. **Setup rate limiting** on ML endpoints
3. **Cache predictions** for common challenges
4. **Monitor model performance** regularly
5. **Auto-retrain** models weekly/monthly
6. **Use GPU** for production deployments
7. **Setup alerting** for model drift

### Scaling

```bash
# Use multiple AI workers
docker-compose -f docker-compose.prod.yml up -d

# Enable caching layer (Redis)
# Setup load balancer (Nginx)
# Use distributed MongoDB (Replica Set)
```

## Contributing

To add new ML features:

1. **Add model** to `bytebattle-ai-service/app/ml/models.py`
2. **Create endpoint** in `bytebattle-ai-service/app/routes/`
3. **Add backend route** in `backend/src/ai/ml.controller.ts`
4. **Create frontend component** in `frontend/src/pages/`
5. **Add tests** and documentation

## Support & Documentation

- **FastAPI Docs**: http://localhost:8001/docs
- **NestJS Swagger**: http://localhost:3000/api/docs
- **Notebook Reference**: `machinelearning.ipynb`

## Next Steps

- [ ] Implement model retraining pipeline
- [ ] Add GPU support for AI service
- [ ] Create advanced analytics dashboard
- [ ] Setup monitoring/alerting
- [ ] Deploy to production
- [ ] Fine-tune models with ByteBattle data
