# Missing Person Detection System - Deployment Guide

## Prerequisites

- Docker & Docker Compose v2+
- Node.js 20+ (for local frontend development)
- PHP 8.2+ (for local backend development)
- Python 3.11+ (for local AI service development)
- MySQL 8.0+
- Redis 7+
- NVIDIA GPU (optional, for AI acceleration)

---

## Quick Start with Docker

### 1. Clone and Configure

```bash
git clone <repository-url>
cd "MISSING PERSON DETECTION SYSTEM"

# Copy environment files
cp backend/.env.example backend/.env
```

### 2. Start All Services

```bash
docker-compose up -d
```

This starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- AI Service: http://localhost:5000
- phpMyAdmin: http://localhost:8080
- MySQL: localhost:3306
- Redis: localhost:6379
- WebSocket: localhost:6001
- Nginx: http://localhost:80

### 3. Initialize Backend

```bash
docker exec mpds-backend php artisan key:generate
docker exec mpds-backend php artisan migrate
docker exec mpds-backend php artisan db:seed
docker exec mpds-backend php artisan storage:link
```

### 4. Verify Services

```bash
# Backend health
curl http://localhost:8000/api/health

# AI service health
curl http://localhost:5000/health

# Frontend
open http://localhost:3000
```

---

## Local Development Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:3000

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

Runs on http://localhost:8000

### AI Service

```bash
cd ai-service
pip install -r requirements.txt
python app.py
```

Runs on http://localhost:5000

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@mpds.gov | password |
| Admin | admin2@mpds.gov | password |
| Officer | officer1@mpds.gov | password |
| Officer | officer2@mpds.gov | password |
| Public User | user@mpds.gov | password |

---

## Production Deployment

### Environment Variables

Update `backend/.env` for production:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_HOST=your-db-host
DB_DATABASE=mpds
DB_USERNAME=your-db-user
DB_PASSWORD=strong-password

REDIS_HOST=your-redis-host

# Twilio SMS
TWILIO_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_FROM=+1234567890

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=mpds-storage
```

### SSL with Nginx

Add to `nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;

    # ... rest of config
}
```

### Docker Production Build

```bash
# Build optimized images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## AI Service GPU Setup

### With NVIDIA GPU

```bash
# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### Without GPU (CPU fallback)

Remove the `runtime: nvidia` and `deploy.resources` sections from `docker-compose.yml` for the `ai-service` service. The AI service will automatically fall back to CPU processing.

---

## Monitoring

### Health Checks

```bash
# All services
curl http://localhost/health

# Individual
curl http://localhost:8000/api/health    # Backend
curl http://localhost:5000/health        # AI Service
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ai-service
docker-compose logs -f queue-worker
```

---

## Backup

### Database

```bash
# Backup
docker exec mpds-database mysqldump -u root -proot_secret mpds > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i mpds-database mysql -u root -proot_secret mpds < backup.sql
```

### Storage

```bash
# Backup uploaded files
tar -czf storage_backup_$(date +%Y%m%d).tar.gz storage/
```

---

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change port mappings in `docker-compose.yml`
2. **MySQL connection refused**: Wait 30s for MySQL to initialize
3. **AI service slow**: Enable GPU or reduce frame processing rate
4. **WebSocket not connecting**: Check REVERB_HOST and port 6001

### Reset Everything

```bash
docker-compose down -v
docker-compose up -d --build
```
