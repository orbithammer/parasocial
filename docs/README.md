# ParaSocial

A **unidirectional social network** for content creators. ParaSocial allows creators to post content that followers can read, but followers cannot respond directly. Built with ActivityPub federation support for interoperability with Mastodon, Pleroma, and other federated social networks.

## 🎯 Project Vision

ParaSocial addresses the need for creators to share content without managing overwhelming social interactions. Followers from federated platforms can follow and read posts, but cannot reply or comment directly, creating a healthier creator experience.

## 📢 Potential Use Cases

### Broadcasting-First Use Cases

**High-Volume Content Creators**
- Major YouTubers or streamers who receive thousands of replies they can't realistically engage with
- Popular artists who want to share work without managing overwhelming fan interactions
- Musicians with large followings announcing tours, releases, and updates

**Professional Announcements**
- Companies making official statements, product launches, or policy updates
- Legal experts providing general educational content without giving specific legal advice
- Medical professionals sharing health information while avoiding individual medical consultations

### Authority & Safety-Critical Communications

**News & Emergency Broadcasting**
- Breaking news outlets that need one-way information dissemination
- Emergency services broadcasting safety alerts and evacuation notices
- Weather services providing forecasts without fielding individual weather questions
- Government agencies making official announcements

**Expert Information Sharing**
- Financial advisors sharing market insights while avoiding unlicensed individual advice
- Researchers announcing findings without managing academic debates in comments
- Public health officials broadcasting guidelines during health crises

### High-Profile Individuals

**Public Figures with Safety Concerns**
- Politicians sharing policy positions without opening harassment vectors
- Activists broadcasting important causes while avoiding coordinated attacks
- Journalists reporting on sensitive topics who need to limit direct contact

**Busy Professionals**
- Startup founders documenting their journey without time for extensive community management
- Conference speakers sharing key insights without managing post-talk discussions
- Industry executives making strategic announcements

These use cases specifically benefit from the ability to broadcast valuable information to the fediverse while avoiding the time burden, potential harassment, or professional liability that comes with bidirectional engagement.

## ✨ Features

### MVP (Phase 1-3)
- ✅ **Creator Accounts**: Registration and authentication for content creators
- ✅ **Content Publishing**: Create and schedule posts with media attachments
- ✅ **Follower Management**: View and manage followers from federated platforms
- ✅ **ActivityPub Federation**: Full compatibility with Mastodon, Pleroma, etc.
- ✅ **Moderation Tools**: Block followers and report inappropriate content
- ✅ **Verification System**: Multi-tier verification (email, phone, identity, notable)

### Future Phases
- 📊 **Analytics Dashboard**: Post engagement and follower insights
- 🎨 **Customizable Profiles**: Themes and branding options
- 🔐 **Advanced Security**: 2FA, device tracking, ban evasion prevention
- 📱 **Mobile App**: Native iOS and Android applications
- 💰 **Monetization**: Creator subscription and tip features

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Authentication**: JWT tokens
- **Federation**: ActivityPub protocol

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks + Context API
- **HTTP Client**: Fetch API with custom hooks

### DevOps
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL in Docker
- **Development**: Hot reload for both frontend and backend

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ParaSocial.git
   cd ParaSocial
   ```

2. **Start the database**
   ```bash
   docker-compose up -d
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Set up the database**
   ```bash
   # Copy environment file
   cp .env.example .env
   
   # Push database schema
   npm run db:push
   npm run db:generate
   ```

5. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

6. **Start development servers**
   
   **Backend** (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```
   
   **Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database Admin: `npm run db:studio` (from backend folder)

## 📁 Project Structure

```
ParaSocial/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/         # API endpoint definitions
│   │   ├── middleware/     # Authentication, validation, etc.
│   │   ├── services/       # Business logic
│   │   ├── models/         # Prisma database models
│   │   └── utils/          # Helper functions
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── uploads/            # Media file storage
│   └── package.json
├── frontend/               # Next.js web application
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API communication
│   │   └── types/         # TypeScript definitions
│   └── package.json
├── docs/                   # Project documentation
│   ├── api.md             # API endpoint documentation
│   └── setup.md           # Detailed setup instructions
├── docker-compose.yml      # Database configuration
└── README.md              # This file
```

## 📚 Documentation

- **[API Documentation](./docs/api.md)** - Complete API reference
- **[Setup Guide](./docs/setup.md)** - Detailed installation instructions
- **[Database Schema](./backend/prisma/schema.prisma)** - Data model definitions

## 🔧 Development Commands

### Backend Commands
```bash
cd backend

# Development
npm run dev              # Start development server
npm run build            # Build for production
npm start               # Start production server

# Database
npm run db:push         # Update database schema
npm run db:generate     # Generate Prisma client
npm run db:studio       # Open database admin UI
npm run db:migrate      # Create migration files
npm run db:reset        # Reset database (destructive)

# Utilities
npm test                # Run tests
npm run lint            # Lint code
```

### Frontend Commands
```bash
cd frontend

# Development
npm run dev             # Start development server
npm run build           # Build for production
npm start              # Start production server

# Utilities
npm test               # Run tests
npm run lint           # Lint code
npm run type-check     # TypeScript checking
```

## 🌐 ActivityPub Federation

ParaSocial implements the ActivityPub protocol for federation with other social networks:

- **Follow Support**: Users on Mastodon, Pleroma, etc. can follow ParaSocial creators
- **Content Delivery**: Posts are delivered to followers' home feeds
- **WebFinger Discovery**: Automatic user discovery across instances
- **HTTP Signatures**: Secure authentication for federated activities

### Federation Endpoints
- `/.well-known/webfinger` - User discovery
- `/users/{username}` - Actor profiles
- `/users/{username}/inbox` - Incoming activities
- `/users/{username}/outbox` - User's activities

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive data validation
- **Content Warnings**: Support for sensitive content
- **Moderation Tools**: User blocking and content reporting
- **Ban Evasion Prevention**: IP and device fingerprinting

## 🚀 Deployment

### Production Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/parasocial"
JWT_SECRET="your-super-secret-jwt-key"
NODE_ENV="production"
PORT=3001
DOMAIN="your-domain.com"
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL="https://api.your-domain.com"
```

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ParaSocial/issues)
- **Documentation**: [Project Wiki](https://github.com/yourusername/ParaSocial/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ParaSocial/discussions)

## 🎯 Development Roadmap

### Phase 1: Foundation & Planning ✅
- [x] MVP scope definition
- [x] Technology stack selection
- [x] Development environment setup
- [x] Database schema design
- [x] API documentation

### Phase 2: Local Backend Core 🚧
- [ ] User authentication system
- [ ] Basic CRUD operations
- [ ] Input validation and security
- [ ] Media upload handling
- [ ] API endpoint implementation

### Phase 3: ActivityPub Federation
- [ ] WebFinger implementation
- [ ] Actor creation and management
- [ ] Activity processing
- [ ] Follow/Unfollow handling
- [ ] Content delivery

### Phase 4: Frontend Application
- [ ] User interface design
- [ ] Authentication flows
- [ ] Post creation and management
- [ ] Follower management
- [ ] Responsive design

### Phase 5: Advanced Features
- [ ] Analytics dashboard
- [ ] Advanced moderation
- [ ] Performance optimization
- [ ] Mobile applications

---

**Built with ❤️ for content creators who deserve better social media experiences.**