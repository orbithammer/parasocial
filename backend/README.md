# ParaSocial Backend API

## 🚀 Overview

ParaSocial is a modern social media platform built with TypeScript, Express.js, and PostgreSQL. The backend provides a robust RESTful API with a layered architecture designed for scalability, maintainability, and future ActivityPub federation support.

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Setup](#-environment-setup)
- [Database Setup](#-database-setup)
- [Development](#-development)
- [Testing](#-testing)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Middleware](#-middleware)
- [Authentication](#-authentication)
- [File Uploads](#-file-uploads)
- [Future Features](#-future-features)
- [Contributing](#-contributing)

## 🛠 Tech Stack

### Core Framework
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript for type safety
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Vitest for fast unit and integration testing

### Authentication & Security
- **Password Hashing**: Argon2 (memory-hard, secure)
- **JWT**: jsonwebtoken for stateless authentication
- **Input Validation**: Zod for TypeScript schema validation
- **Rate Limiting**: express-rate-limit for abuse prevention

### Development & Utilities
- **Environment Config**: dotenv for environment management
- **Logging**: Pino for structured JSON logging
- **HTTP Client**: Built-in fetch for external requests
- **Date Handling**: date-fns for ActivityPub-compliant formatting

## 🏗 Architecture

The backend follows a layered architecture pattern:

```
┌─────────────────┐
│    Controllers  │ ← HTTP request handling
├─────────────────┤
│    Services     │ ← Business logic
├─────────────────┤
│   Repositories  │ ← Data access layer
├─────────────────┤
│     Models      │ ← Data structures
├─────────────────┤
│    Database     │ ← PostgreSQL + Prisma
└─────────────────┘
```

### Layer Responsibilities

- **Controllers**: Handle HTTP requests, validation, and responses
- **Services**: Implement business logic and coordinate between repositories
- **Repositories**: Abstract database operations and data access
- **Models**: Define TypeScript interfaces and data structures
- **Middleware**: Cross-cutting concerns (auth, validation, security)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- Docker and Docker Compose (recommended)

### Quick Start

1. **Clone and install dependencies**
   ```powershell
   cd backend
   npm install
   ```

2. **Set up environment variables**
   ```powershell
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the database**
   ```powershell
   docker-compose up -d postgres
   ```

4. **Run database migrations**
   ```powershell
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the development server**
   ```powershell
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## 🔧 Environment Setup

### Required Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database Configuration
DATABASE_URL="postgresql://parasocial_user:parasocial_pass@localhost:5433/parasocial_dev"

# Server Configuration
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=info

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
```

### Environment-Specific Configurations

- **Development**: Uses local PostgreSQL or Docker
- **Testing**: Dedicated test database with faster bcrypt rounds
- **Production**: Enhanced security settings and SSL

## 🗄 Database Setup

### Using Docker (Recommended)

```powershell
# Start PostgreSQL container
docker-compose up -d postgres

# Check container status
docker-compose ps

# View database logs
docker-compose logs postgres
```

### Manual PostgreSQL Setup

1. **Install PostgreSQL**
2. **Create database and user**
   ```sql
   CREATE USER parasocial_user WITH PASSWORD 'parasocial_pass';
   CREATE DATABASE parasocial_dev OWNER parasocial_user;
   GRANT ALL PRIVILEGES ON DATABASE parasocial_dev TO parasocial_user;
   ```

### Database Operations

```powershell
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database (development only)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

## 💻 Development

### Available Scripts

```powershell
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### Development Workflow

1. **Create feature branch**
   ```powershell
   git checkout -b feature/user-profiles
   ```

2. **Write tests first** (TDD approach)
   ```powershell
   # Create test file
   touch src/controllers/__tests__/NewController.test.ts
   npm run test:watch
   ```

3. **Implement feature**
   - Add models, repositories, services, controllers
   - Follow existing patterns and naming conventions

4. **Run full test suite**
   ```powershell
   npm test
   npm run lint
   npm run type-check
   ```

## 🧪 Testing

### Testing Strategy

- **Unit Tests**: Individual functions and classes
- **Integration Tests**: API endpoints and database operations
- **Test Database**: Isolated test environment with fast setup/teardown

### Writing Tests

```typescript
// Example controller test
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { testServer } from '../../../utils/testServer'

describe('UserController', () => {
  beforeEach(async () => {
    // Setup test data
  })

  afterEach(async () => {
    // Cleanup test data
  })

  it('should create a new user', async () => {
    // Arrange
    const userData = { username: 'testuser', email: 'test@example.com' }

    // Act
    const response = await testServer
      .post('/api/users')
      .send(userData)

    // Assert
    expect(response.status).toBe(201)
    expect(response.body.username).toBe('testuser')
  })
})
```

### Running Tests

```powershell
# Run all tests
npm test

# Run specific test file
npm test -- UserController.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh JWT token

### User Endpoints
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `GET /users/:userId` - Get user by ID
- `POST /users/avatar` - Upload user avatar

### Post Endpoints
- `GET /posts` - Get paginated posts feed
- `POST /posts` - Create new post
- `GET /posts/:postId` - Get specific post
- `PUT /posts/:postId` - Update post
- `DELETE /posts/:postId` - Delete post
- `POST /posts/:postId/like` - Like/unlike post

### Follow Endpoints
- `POST /follow/:userId` - Follow user
- `DELETE /follow/:userId` - Unfollow user
- `GET /follow/followers` - Get followers list
- `GET /follow/following` - Get following list

### Media Endpoints
- `POST /media/upload` - Upload media file
- `GET /media/:filename` - Serve media file

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/           # HTTP request handlers
│   │   ├── AuthController.ts
│   │   ├── UserController.ts
│   │   ├── PostController.ts
│   │   └── FollowController.ts
│   ├── services/             # Business logic layer
│   │   ├── AuthService.ts
│   │   ├── FollowService.ts
│   │   └── container.ts      # Dependency injection
│   ├── repositories/         # Data access layer
│   │   ├── UserRepository.ts
│   │   ├── PostRepository.ts
│   │   └── FollowRepository.ts
│   ├── models/              # TypeScript interfaces
│   │   ├── User.ts
│   │   ├── Post.ts
│   │   └── Report.ts
│   ├── routes/              # Express route definitions
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   └── media.ts
│   ├── middleware/          # Cross-cutting concerns
│   │   ├── authMiddleware.ts
│   │   ├── postValidationMiddleware.ts
│   │   ├── followValidationMiddleware.ts
│   │   ├── securityValidationMiddleware.ts
│   │   ├── staticFileSecurityMiddleware.ts
│   │   ├── expressAwareSecurityMiddleware.ts
│   │   └── globalError.ts
│   ├── config/              # Configuration files
│   │   ├── testDatabase.ts
│   │   └── testEnvironment.ts
│   ├── utils/               # Utility functions (planned)
│   │   ├── validators.ts
│   │   ├── logger.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── app.ts               # Express app configuration
│   └── index.ts             # Application entry point
├── prisma/
│   └── schema.prisma        # Database schema
├── uploads/                 # File upload directory
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── README.md
```

## 🛡 Middleware

### Security Middleware
- **authMiddleware**: JWT token validation
- **staticFileSecurityMiddleware**: Secure file serving
- **expressAwareSecurityMiddleware**: Express-specific security
- **securityValidationMiddleware**: Input sanitization

### Validation Middleware
- **postValidationMiddleware**: Post content validation
- **followValidationMiddleware**: Follow relationship validation

### Error Handling
- **globalError**: Centralized error handling and logging

## 🔐 Authentication

### JWT Authentication
- Access tokens for API requests
- Refresh tokens for long-term sessions
- Secure password hashing with Argon2

### Password Security
- Minimum 8 characters required
- Argon2 hashing (memory-hard algorithm)
- Configurable rounds for security/performance balance

### Token Management
```typescript
// Example authentication flow
const loginUser = async (email: string, password: string) => {
  // Validate credentials
  const user = await authService.validateCredentials(email, password)
  
  // Generate tokens
  const accessToken = authService.generateAccessToken(user.id)
  const refreshToken = authService.generateRefreshToken(user.id)
  
  return { user, accessToken, refreshToken }
}
```

## 📁 File Uploads

### Supported File Types
- Images: JPEG, PNG, GIF, WebP
- Maximum size: 10MB (configurable)
- Secure filename sanitization

### Upload Security
- File type validation
- Size limits
- Secure storage in `uploads/` directory
- Static file serving with security headers

### Upload Endpoints
```typescript
// Upload user avatar
POST /api/users/avatar
Content-Type: multipart/form-data

// Upload post media
POST /api/media/upload
Content-Type: multipart/form-data
```

## 🔮 Future Features (Phase 3)

### ActivityPub Federation
- **WebFinger Service**: User discovery across instances
- **ActivityPub Protocol**: Standard federation support
- **HTTP Signatures**: Secure federated authentication
- **Actor Management**: ActivityPub actor creation and management

### Planned Components
- `services/ActivityPubService.ts` - Core federation logic
- `services/WebFingerService.ts` - User discovery
- `routes/webfinger.ts` - WebFinger endpoints
- `routes/activitypub.ts` - ActivityPub endpoints
- `middleware/activityPubMiddleware.ts` - Federation validation

## 🤝 Contributing

### Development Guidelines
1. **Type Safety**: Never use `any` type - use proper TypeScript types
2. **Testing**: Write tests for all new functionality
3. **Code Style**: Follow existing patterns and naming conventions
4. **Documentation**: Update README for significant changes
5. **Commits**: Use clear, descriptive commit messages

### Code Standards
- Use semantic HTML in views
- Comment all new code
- No semicolons as statement delimiters
- Unit test best practices with Vitest
- PowerShell commands for Windows compatibility

### Pull Request Process
1. Create feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation if needed
5. Submit pull request with clear description

---
