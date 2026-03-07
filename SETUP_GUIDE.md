# TEGA.RWA Setup Guide

Complete guide to set up and run the TEGA.RWA bus booking application locally.

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Local Installation](#local-installation)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Verification Checklist](#verification-checklist)
8. [Troubleshooting](#troubleshooting)
9. [Test Credentials](#test-credentials)

---

## 🖥️ System Requirements

### **Minimum Requirements:**
- **Node.js** ≥ 18.0.0 (20.x LTS recommended)
- **PostgreSQL** 15+ (or Docker with PostgreSQL image)
- **npm** Latest version
- **Git** (for version control)

### **Recommended Setup:**
- **Docker Desktop** (Windows/Mac) or Docker Engine (Linux)
- **Visual Studio Code** with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Thunder Client or Postman (API testing)
  - SQL tools (for database inspection)

### **Verify Installed:**
```bash
node --version        # Should be v18.0.0 or higher
npm --version         # Should be 9.0.0 or higher
git --version         # Any recent version
```

---

## 🚀 Quick Start (Docker)

**Fastest way to run everything** — all services start automatically.

### **Prerequisites:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running

### **Steps:**

1. **Clone/Navigate to project:**
   ```bash
   cd TEGA.RWA
   ```

2. **Start all services:**
   ```bash
   docker compose up --build
   ```

3. **Wait for services to be ready:**
   ```
   backend    | Server running on http://localhost:5000
   postgres   | database system is ready to accept connections
   frontend   | ▲ Next.js ready on http://localhost:3000
   ```

4. **Access the application:**
   - **Frontend:** http://localhost:3000
   - **API Docs:** http://localhost:5000/api/docs
   - **Health Check:** http://localhost:5000/health

5. **Stop all services:**
   ```bash
   docker compose down
   ```

**That's it!** Docker handles:
- ✅ PostgreSQL database creation and initialization
- ✅ Database schema migrations
- ✅ Seed data loading
- ✅ Backend server startup
- ✅ Frontend server startup

---

## 💻 Local Installation

**For development** — run services individually on your machine.

### **Prerequisites:**
1. **PostgreSQL** installed locally
2. **Node.js** (v18+) and npm
3. Project cloned to your machine

### **Step 1: Install PostgreSQL**

#### **Windows:**
1. Download from https://www.postgresql.org/download/windows/
2. Run installer, choose default options
3. Set postgres password (remember this!)
4. Port: 5432

#### **Mac (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### **Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### **Verify Installation:**
```bash
psql --version
psql -U postgres -c "SELECT version();"
```

---

### **Step 2: Create Database**

```bash
# Connect to PostgreSQL
psql -U postgres

# In PostgreSQL prompt:
CREATE DATABASE tega_rw_db;
\q  # Quit
```

Verify:
```bash
psql -U postgres -d tega_rw_db -c "\dt"  # Should show empty database
```

---

### **Step 3: Backend Setup**

```bash
cd backend

# Install dependencies
npm install

# Create .env file (see Environment Configuration section below)
cp .env.example .env
# Edit .env with your database password

# Run database migrations
npm run migrate

# (Optional) Load seed data
npm run seed

# Start development server
npm run dev
```

**Expected Output:**
```
Server running on port 5000
Database connected
```

---

### **Step 4: Frontend Setup**

Open **new terminal window** (keep backend running):

```bash
cd frontend

# Install dependencies
npm install

# Create environment config
cp .env.local.example .env.local

# Start development server
npm run dev
```

**Expected Output:**
```
▲ Next.js ready on http://localhost:3000
```

---

## 🔧 Environment Configuration

### **Backend Configuration** (`backend/.env`)

Create `backend/.env` file with the following (adjust values as needed):

```bash
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tega_rw_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password  # Change this!

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Payment Providers (Mocked for MVP)
MOMO_API_KEY=mock_key
MOMO_SUBSCRIPTION_KEY=mock_key
AIRTEL_CLIENT_ID=mock_id
AIRTEL_CLIENT_SECRET=mock_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@tega.rw
```

**Generate Secure Secrets (Linux/Mac/WSL):**
```bash
openssl rand -hex 32  # Copy output to JWT_SECRET
openssl rand -hex 32  # Copy output to JWT_REFRESH_SECRET
```

**For Windows PowerShell:**
```powershell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([guid]::NewGuid().ToString()))
```

---

### **Frontend Configuration** (`frontend/.env.local`)

Create `frontend/.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

---

## 🗄️ Database Setup

### **What Happens Automatically:**

When you run `npm run migrate` in the backend:

1. **Schema Created** — 10 tables with proper relationships
2. **Indexes Added** — Optimized for search and booking queries
3. **Enums Defined** — User roles, payment methods, bus types, etc.
4. **Constraints** — Data integrity rules (unique phones, valid dates, etc.)

### **Tables Created:**
- **users** — Passengers, agencies, admins
- **agencies** — Bus company information
- **stations** — Bus terminals/stops
- **routes** — Route definitions between stations
- **buses** — Bus inventory with seating capacity
- **seats** — Per-bus seat assignments with classes
- **schedules** — Bus trips with pricing and timestamps
- **bookings** — Seat reservations with expiry
- **payments** — Payment tracking and history
- **tickets** — Auto-generated on payment confirmation

### **Optional: Load Seed Data**

Populates sample records for testing:

```bash
npm run seed
```

**Seed Includes:**
- Admin user: `+250788000001` / `Admin@1234`
- Agency manager: `+250788000002` / `Agency@1234`
- 6 stations across Rwanda
- 4 routes with schedules
- 2 buses with different seat configurations
- 3 scheduled trips ready to book

### **View Database Schema:**

```bash
# Connect to database
psql -U postgres -d tega_rw_db

# List all tables
\dt

# View users table structure
\d users

# Count records
SELECT COUNT(*) FROM users;

# Exit
\q
```

---

## ▶️ Running the Application

### **Option 1: Both Services with Docker**

```bash
docker compose up --build
```

### **Option 2: Both Services Locally**

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### **Option 3: Production Build**

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm start
```

---

## ✅ Verification Checklist

Before starting development, verify:

- [ ] PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
- [ ] Database created: `psql -U postgres -d tega_rw_db -c "\dt" | wc -l` (should show >10 tables)
- [ ] Backend `.env` configured with correct DB password
- [ ] Frontend `.env.local` configured with API URL
- [ ] Backend starts without errors: `npm start` (port 5000)
- [ ] Frontend starts without errors: `npm run dev` (port 3000)
- [ ] API docs accessible: http://localhost:5000/api/docs
- [ ] Health check passes: http://localhost:5000/health
- [ ] Frontend loads: http://localhost:3000

**Test Login:**
1. Navigate to http://localhost:3000
2. Click "Sign In"
3. Enter phone: `+250788000001`
4. Enter password: `Admin@1234`
5. Should redirect to /dashboard

---

## 🐛 Troubleshooting

### **Issue: "PostgreSQL connection refused"**

**Cause:** Database not running or wrong credentials

**Solution:**
```bash
# Check if PostgreSQL is running
# Windows: Check Services in Task Manager
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# Verify connection
psql -U postgres -c "SELECT 1"

# Update backend/.env with correct password
DB_PASSWORD=your_actual_password
```

---

### **Issue: "Port 5000 already in use"**

**Cause:** Another process using the port

**Solution (Windows PowerShell):**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess
Stop-Process -Id <PID> -Force
npm start
```

**Solution (Mac/Linux):**
```bash
lsof -ti:5000 | xargs kill -9
npm start
```

---

### **Issue: "Cannot find module 'pg'"**

**Cause:** Dependencies not installed

**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm start
```

---

### **Issue: "JWT_SECRET is not defined"**

**Cause:** `.env` file missing or incomplete

**Solution:**
```bash
# Verify .env exists in backend/
ls -la backend/.env

# Add missing variable
echo "JWT_SECRET=$(openssl rand -hex 32)" >> backend/.env
npm start
```

---

### **Issue: Database migrations failed**

**Cause:** Schema already exists or permission denied

**Solution:**
```bash
# Check tables exist
psql -U postgres -d tega_rw_db -c "\dt"

# If tables exist but migration errored, check error logs
# Otherwise, drop and recreate database:
psql -U postgres -c "DROP DATABASE tega_rw_db;"
psql -U postgres -c "CREATE DATABASE tega_rw_db;"
npm run migrate
```

---

### **Issue: Frontend shows "Cannot POST /api/v1/auth/login"**

**Cause:** Backend not running or wrong API URL

**Solution:**
1. Start backend: `npm start` in `backend/` directory
2. Verify API URL in `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1`
3. Restart frontend dev server

---

### **Issue: Docker containers won't start**

**Cause:** Port conflicts or Docker daemon not running

**Solution:**
```bash
# Ensure Docker is running
docker --version  # Should work

# Stop existing containers
docker compose down

# Remove volumes (WARNING: deletes data)
docker compose down -v

# Rebuild and start
docker compose up --build
```

---

## 🔐 Test Credentials

Use these accounts to test functionality:

### **Admin User**
```
Phone: +250788000001
Password: Admin@1234
Role: admin
```
Access: Admin dashboard, all system features

### **Agency Manager**
```
Phone: +250788000002
Password: Agency@1234
Role: agency
```
Access: Agency dashboard, bus management

### **Passenger (Register New)**
```
Phone: Any 10-15 digits
Email: Optional
Password: Min 8 chars (uppercase + lowercase + number)
```
Access: Search, book, payment, tickets

---

## 📞 Common Commands

```bash
# Backend
cd backend
npm install      # Install dependencies
npm run dev      # Start development server
npm run migrate  # Initialize database schema
npm run seed     # Load sample data
npm start        # Start production server
npm test         # Run tests (if configured)

# Frontend
cd frontend
npm install      # Install dependencies
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server

# Database
psql -U postgres                    # Connect to PostgreSQL
psql -U postgres -d tega_rw_db -c "\dt"  # List tables
psql -U postgres -c "DROP DATABASE tega_rw_db;"  # Delete database
```

---

## 🎯 Next Steps

1. **Complete setup** using Docker or Local installation
2. **Verify with the checklist** above
3. **Test login** with provided credentials
4. **Explore API docs** at http://localhost:5000/api/docs
5. **Check PROJECT_STATUS.md** for development roadmap

---

## 📚 Additional Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Express.js Docs:** https://expressjs.com
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **API Specification:** http://localhost:5000/api/docs (Swagger UI)

---

## ❓ Still Having Issues?

1. Check **Troubleshooting** section above
2. Review **PROJECT_STATUS.md** for known issues
3. Check backend logs: `npm run dev` outputs all errors
4. Verify all **Verification Checklist** items above

---

**Last Updated:** March 7, 2026
