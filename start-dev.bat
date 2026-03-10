@echo off
REM TEGA.RW Development Startup Script
REM Starts the Supabase TCP proxy (for Docker IPv6 workaround) then docker-compose

echo [TEGA.RW] Starting Supabase DB proxy on port 15432...
start "Supabase DB Proxy" /min node "%~dp0db-proxy.js"

timeout /t 2 /nobreak >nul

echo [TEGA.RW] Starting Docker containers...
cd /d "%~dp0"
docker compose up

REM When docker compose exits, clean up proxy
echo [TEGA.RW] Stopping proxy...
taskkill /FI "WINDOWTITLE eq Supabase DB Proxy" /F >nul 2>&1
