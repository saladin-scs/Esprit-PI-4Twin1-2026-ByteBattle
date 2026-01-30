# Contributing to ByteBattle

Thank you for your interest in contributing to ByteBattle! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/bytebattle.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit your changes: `git commit -m "Add your feature"`
6. Push to your branch: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Development Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

## Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add comments for complex logic

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Request review from maintainers
4. Address any feedback

## Questions?

Feel free to open an issue for any questions or concerns.

