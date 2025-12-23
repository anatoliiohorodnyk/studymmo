# StudyMMO - Educational Idle MMO

An educational idle MMO where players progress through educational institutions, study subjects, earn grades, and compete in olympiads.

## Tech Stack

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: Next.js 14 + Tailwind + Zustand
- **Database**: PostgreSQL
- **Cache**: Redis

## Quick Start

### 1. Start Database

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Seed the database
npm run db:seed

# Start development server
npm run start:dev
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## Project Structure

```
studymmo/
├── backend/           # NestJS API
│   ├── prisma/        # Database schema & migrations
│   └── src/
│       ├── modules/   # Feature modules
│       ├── common/    # Shared utilities
│       └── config/    # Game configuration
│
├── frontend/          # Next.js App
│   └── src/
│       ├── app/       # App router pages
│       ├── components/# UI components
│       ├── stores/    # Zustand stores
│       └── lib/       # API client
│
└── docker-compose.yml # Production setup
```

## Features (MVP v0.1)

- [x] User authentication (JWT)
- [x] Character creation with city selection
- [x] 9 subjects with independent leveling
- [x] Study mechanic (endless clicks)
- [x] Grade generation
- [x] Prep School + School locations
- [x] Class completion tracking
- [x] Mobile-responsive UI

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh tokens

### Game
- `GET /api/characters/me` - Get character
- `POST /api/study` - Study click
- `GET /api/locations/progress` - Get location progress
- `GET /api/grades` - Get grades
- `GET /api/subjects` - List subjects
- `GET /api/cities` - List cities

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:pass@localhost:5432/studymmo"
JWT_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## License

MIT
