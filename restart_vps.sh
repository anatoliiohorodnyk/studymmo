#!/bin/bash

# StudyMMO VPS Production Deployment Script
# Usage: ./restart_vps.sh [options]
#   --build     Force rebuild of containers
#   --reset-db  Reset database and reseed (WARNING: destroys all data!)
#   --logs      Show logs after starting
#   --help      Show this help

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BUILD=false
RESET_DB=false
SHOW_LOGS=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --build)
      BUILD=true
      ;;
    --reset-db)
      RESET_DB=true
      ;;
    --logs)
      SHOW_LOGS=true
      ;;
    --help)
      echo "StudyMMO VPS Production Deployment"
      echo ""
      echo "Usage: ./restart_vps.sh [options]"
      echo ""
      echo "Options:"
      echo "  --build      Force rebuild of containers"
      echo "  --reset-db   Reset database and reseed (WARNING: destroys all data!)"
      echo "  --logs       Show logs after starting"
      echo "  --help       Show this help"
      exit 0
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   StudyMMO VPS Production Deploy      ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found!${NC}"
  echo -e "${YELLOW}Copy .env.example to .env and configure it:${NC}"
  echo "  cp .env.example .env"
  echo "  nano .env"
  exit 1
fi

# Source .env to get variables for display
source .env

# Validate required variables
if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your-secure-password-here" ]; then
  echo -e "${RED}Error: POSTGRES_PASSWORD not set properly in .env${NC}"
  exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-jwt-secret-here" ]; then
  echo -e "${RED}Error: JWT_SECRET not set properly in .env${NC}"
  exit 1
fi

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml down

# Build if requested or if images don't exist
if [ "$BUILD" = true ]; then
  echo -e "${YELLOW}Building containers...${NC}"
  docker compose -f docker-compose.prod.yml build --no-cache
else
  echo -e "${YELLOW}Building containers (if needed)...${NC}"
  docker compose -f docker-compose.prod.yml build
fi

# Start containers
echo -e "${YELLOW}Starting containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
until docker exec studymmo-postgres pg_isready -U ${POSTGRES_USER:-studymmo} 2>/dev/null; do
  sleep 1
done
echo -e "${GREEN}Database is ready!${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 5

# Check if backend is running
if ! docker ps --format '{{.Names}}' | grep -q studymmo-backend; then
  echo -e "${RED}Backend container failed to start! Showing logs:${NC}"
  docker compose -f docker-compose.prod.yml logs backend
  exit 1
fi

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker exec studymmo-backend npx prisma db push --accept-data-loss 2>/dev/null || true

# Reset database if requested
if [ "$RESET_DB" = true ]; then
  echo -e "${YELLOW}Resetting database...${NC}"
  docker exec studymmo-backend npx prisma db push --force-reset
  echo -e "${YELLOW}Seeding database...${NC}"
  docker exec studymmo-backend npx prisma db seed
else
  # Check if database needs seeding
  CITY_COUNT=$(docker exec studymmo-postgres psql -U ${POSTGRES_USER:-studymmo} -d ${POSTGRES_DB:-studymmo} -t -c "SELECT COUNT(*) FROM cities;" 2>/dev/null | tr -d ' ' || echo "0")
  if [ "$CITY_COUNT" = "0" ] || [ -z "$CITY_COUNT" ]; then
    echo -e "${YELLOW}Seeding database...${NC}"
    docker exec studymmo-backend npx prisma db seed
  else
    echo -e "${GREEN}Database already seeded (${CITY_COUNT} cities found)${NC}"
  fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   StudyMMO is running!                ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Frontend: ${BLUE}http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):3000${NC}"
echo -e "Backend:  ${BLUE}http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):3001/api${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  docker compose -f docker-compose.prod.yml logs -f        # View logs"
echo "  docker compose -f docker-compose.prod.yml down           # Stop all"
echo "  docker compose -f docker-compose.prod.yml restart        # Restart"
echo ""

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
  echo -e "${YELLOW}Showing logs (Ctrl+C to exit)...${NC}"
  docker compose -f docker-compose.prod.yml logs -f
fi
