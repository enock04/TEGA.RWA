#!/bin/bash
# TEGA.Rw — Production deployment script
# Run on the VPS: bash deploy.sh

set -e

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building and restarting containers..."
docker compose -f docker-compose.prod.yml up --build -d

echo "==> Waiting for backend to be healthy..."
until docker inspect --format='{{.State.Health.Status}}' tega_rw_backend 2>/dev/null | grep -q "healthy"; do
  echo "   waiting..."
  sleep 3
done

echo "==> Verifying all containers are running..."
docker ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "✓ Deployment complete."
echo "  Passenger: https://app.tega.rw"
echo "  Agency:    https://agency.tega.rw"
echo "  Admin:     https://admin.tega.rw"
echo "  API:       https://api.tega.rw/api/v1"
