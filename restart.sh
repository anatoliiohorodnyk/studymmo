#!/bin/bash

# StudyMMO Development Environment Restart Script
# Usage: ./restart.sh [options]
#   --clean    Remove node_modules and reinstall
#   --reset-db Reset database and reseed
#   --help     Show this help

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CLEAN=false
RESET_DB=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --clean)
      CLEAN=true
      ;;
    --reset-db)
      RESET_DB=true
      ;;
    --help)
      echo "StudyMMO Development Environment"
      echo ""
      echo "Usage: ./restart.sh [options]"
      echo ""
      echo "Options:"
      echo "  --clean      Remove node_modules and reinstall dependencies"
      echo "  --reset-db   Reset database and reseed"
      echo "  --help       Show this help"
      exit 0
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   StudyMMO Development Environment    ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Stop any running processes
echo -e "${YELLOW}Stopping existing processes...${NC}"
pkill -f "nest start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Start Docker containers
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker compose -f docker-compose.dev.yml up -d

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
until docker exec eduquest-postgres-dev pg_isready -U eduquest 2>/dev/null; do
  sleep 1
done
echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Backend setup
echo ""
echo -e "${BLUE}Setting up Backend...${NC}"
cd backend

if [ "$CLEAN" = true ]; then
  echo -e "${YELLOW}Cleaning node_modules...${NC}"
  rm -rf node_modules
fi

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing backend dependencies...${NC}"
  npm install
fi

echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

if [ "$RESET_DB" = true ]; then
  echo -e "${YELLOW}Resetting database...${NC}"
  npx prisma db push --force-reset
  echo -e "${YELLOW}Seeding database...${NC}"
  npm run db:seed
else
  echo -e "${YELLOW}Applying database schema...${NC}"
  npx prisma db push

  # Check if database needs seeding (check if cities exist)
  CITY_COUNT=$(docker exec eduquest-postgres-dev psql -U eduquest -d eduquest_dev -t -c "SELECT COUNT(*) FROM cities;" 2>/dev/null | tr -d ' ' || echo "0")
  if [ "$CITY_COUNT" = "0" ] || [ -z "$CITY_COUNT" ]; then
    echo -e "${YELLOW}Seeding database...${NC}"
    npm run db:seed
  else
    echo -e "${GREEN}Database already seeded (${CITY_COUNT} cities found)${NC}"
  fi
fi

# Start backend in background
echo -e "${YELLOW}Starting backend server...${NC}"
npm run start:dev &
BACKEND_PID=$!

cd ..

# Frontend setup
echo ""
echo -e "${BLUE}Setting up Frontend...${NC}"
cd frontend

if [ "$CLEAN" = true ]; then
  echo -e "${YELLOW}Cleaning node_modules...${NC}"
  rm -rf node_modules .next
fi

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing frontend dependencies...${NC}"
  npm install
fi

# Start frontend in background
echo -e "${YELLOW}Starting frontend server...${NC}"
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Environment is starting up!         ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "Backend:  ${BLUE}http://localhost:3001/api${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Handle Ctrl+C
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping services...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo -e "${GREEN}Done!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
