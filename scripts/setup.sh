#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Missing Person Detection System - Setup Script
# ═══════════════════════════════════════════════════════════════

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          Missing Person Detection System - Setup         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || COMPOSE_CMD="docker compose" || { echo "Docker Compose is required. Aborting."; exit 1; }
COMPOSE_CMD=${COMPOSE_CMD:-"docker-compose"}

echo "✓ Docker found"
echo "✓ Docker Compose found"
echo ""

# Copy environment files
echo "Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✓ Created backend/.env from .env.example"
fi
echo ""

# Build and start containers
echo "Building Docker containers..."
$COMPOSE_CMD build --no-cache
echo "✓ Containers built"
echo ""

echo "Starting services..."
$COMPOSE_CMD up -d
echo "✓ Services started"
echo ""

# Wait for MySQL to be ready
echo "Waiting for MySQL to initialize (30 seconds)..."
sleep 30
echo ""

# Initialize backend
echo "Initializing backend..."
$COMPOSE_CMD exec -T backend php artisan key:generate --force
$COMPOSE_CMD exec -T backend php artisan migrate --force
$COMPOSE_CMD exec -T backend php artisan db:seed --force
$COMPOSE_CMD exec -T backend php artisan storage:link --force
echo "✓ Backend initialized"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
$COMPOSE_CMD exec -T frontend npm install
echo "✓ Frontend dependencies installed"
echo ""

# Rebuild AI index
echo "Building AI face index..."
$COMPOSE_CMD exec -T ai-service python -c "from services.index_service import rebuild_index; rebuild_index()" 2>/dev/null || echo "⚠ AI index will be built on first use"
echo ""

echo "╔═════════════════════════════════════════════════════════╗"
echo "║   Setup Complete!                                       ║"
echo "╠═════════════════════════════════════════════════════════╣"
echo "║   Frontend:    http://localhost:3000                    ║"
echo "║   Backend API: http://localhost:8000/api                ║"
echo "║   AI Service:  http://localhost:5000                    ║"
echo "║   phpMyAdmin:  http://localhost:8080                    ║"
echo "║                                                         ║"
echo "║   Default Login:                                        ║"
echo "║   Admin:   admin@mpds.gov / password                    ║"
echo "║   Officer: officer1@mpds.gov / password                 ║"
echo "║   Public:  user@mpds.gov / password                     ║"
echo "╚═════════════════════════════════════════════════════════╝"
