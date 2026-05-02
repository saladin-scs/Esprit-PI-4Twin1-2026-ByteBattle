# ByteBattle - Real-Time Collaborative Coding Challenge Platform

## Project Overview

ByteBattle is a gamified coding challenge platform that enables students and developers to compete in real-time coding battles, solve algorithmic problems, and improve their programming skills through AI-generated challenges. The platform combines competitive programming with collaborative learning, featuring an intelligent judge system, live leaderboards, multiplayer battles, and AI-powered code analysis.

## Features

- 🎯 **Real-time Code Execution**: Secure sandboxed environment for code execution
- 🤖 **AI-Powered Challenges**: AI-generated coding challenges and intelligent hints
- 🏆 **Competitive Modes**: Solo challenges, 1v1 battles, and team competitions
- 📊 **Live Leaderboards**: Real-time rankings and progress tracking
- 🎖️ **Achievement System**: Badges and achievements for milestones
- 💬 **Real-time Chat**: Communication during competitions
- 📈 **Progress Dashboard**: Comprehensive statistics and learning paths

## Technology Stack

### Frontend
- React 18+ with TypeScript
- State Management: Redux Toolkit
- UI Framework: Tailwind CSS
- Real-time Communication: Socket.io-client
- HTTP Client: Axios
- Build Tool: Vite

### Backend
- NestJS with TypeScript
- Authentication: JWT + Passport.js
- Real-time: Socket.io
- Database: MongoDB
- Validation: class-validator, class-transformer
- API Documentation: Swagger/OpenAPI

### AI Integration
- OpenRouter (challenge generation) + microservice FastAPI (code analysis)

### DevOps
- Docker & Docker Compose
- CI/CD with GitHub Actions
- Monitoring and logging

## Project Structure

```
bytebattle/
├── backend/          # NestJS backend application
├── frontend/         # React frontend application
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Docker and Docker Compose
- MongoDB (or use Docker)
- OpenAI/Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bytebattle
```

2. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Set up environment variables:
```bash
# Docker Compose (optional, recommended for local dev)
# Copy .env.example to .env at repo root and adjust values

# Backend - Create .env file in backend/
# Copy backend/.env.example to backend/.env and adjust values

# Frontend - Create .env file in frontend/
# Copy frontend/.env.example to frontend/.env (optional)
```

4. Start with Docker Compose:
```bash
docker-compose up -d
```

Or run locally:
```bash
# Backend (from backend/)
npm run start:dev

# Frontend (from frontend/)
npm run dev
```

## Development

### Backend Development
```bash
cd backend
npm run start:dev      # Development mode with hot reload
npm run build          # Build for production
npm run test           # Run tests
```

### Frontend Development
```bash
cd frontend
npm run dev            # Development server
npm run build          # Build for production
npm run preview        # Preview production build
```

## API Documentation

Once the backend is running, access Swagger documentation at:
```
http://localhost:3000/api
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## License

MIT License

