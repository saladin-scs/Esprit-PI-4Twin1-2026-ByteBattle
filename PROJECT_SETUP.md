# ByteBattle Project Setup Guide

## Project Structure

```
bytebattle/
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # User management
│   │   ├── challenges/     # Challenge system
│   │   ├── code-execution/ # Code execution engine
│   │   ├── competitions/   # Competition system
│   │   ├── leaderboard/    # Leaderboard system
│   │   ├── achievements/   # Achievement system
│   │   ├── chat/           # Real-time chat (Socket.io)
│   │   └── ai/             # AI integration
│   ├── Dockerfile
│   └── package.json
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store
│   │   └── services/       # API services
│   ├── Dockerfile
│   └── package.json
├── .github/
│   └── workflows/          # CI/CD pipelines
├── docker-compose.yml      # Docker orchestration
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (or use Docker)
- OpenAI/Anthropic API key (for AI features)

### Installation Steps

1. **Clone and Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run with Docker (Recommended)**
   ```bash
   docker-compose up -d
   ```

4. **Run Locally**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run start:dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/bytebattle
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## API Documentation

Once the backend is running, access Swagger documentation at:
- http://localhost:3000/api

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `npm test` (backend) or `npm run lint` (frontend)
4. Commit: `git commit -m "Add feature"`
5. Push: `git push origin feature/your-feature`
6. Create Pull Request

## Key Features Implemented

### Backend
- ✅ User authentication (JWT)
- ✅ User management
- ✅ Challenge CRUD operations
- ✅ Code execution endpoint (placeholder)
- ✅ Competition system structure
- ✅ Leaderboard structure
- ✅ Achievement system structure
- ✅ Real-time chat (Socket.io)
- ✅ AI service structure
- ✅ Swagger API documentation

### Frontend
- ✅ React 18 with TypeScript
- ✅ Redux Toolkit for state management
- ✅ React Router for navigation
- ✅ Tailwind CSS for styling
- ✅ Monaco Editor for code editing
- ✅ Authentication pages (Login/Register)
- ✅ Challenge pages
- ✅ Dashboard structure
- ✅ API service layer

## Next Steps

### High Priority
1. Implement secure code execution engine (Docker-based sandbox)
2. Integrate OpenAI/Anthropic API for challenge generation
3. Complete real-time competition features
4. Implement leaderboard calculations
5. Add achievement system logic

### Medium Priority
1. Add unit and integration tests
2. Implement code quality analysis
3. Add progress tracking
4. Complete dashboard features
5. Add more challenge categories

### Low Priority
1. Add social features
2. Implement team competitions
3. Add challenge sharing
4. Mobile responsiveness improvements

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `docker-compose up mongodb`
- Check connection string in `.env`

### Port Conflicts
- Backend default: 3000
- Frontend default: 5173
- MongoDB default: 27017
- Change ports in docker-compose.yml if needed

### CORS Issues
- Update `CORS_ORIGIN` in backend `.env`
- Ensure frontend URL matches

## Support

For issues or questions, please open an issue on GitHub.

