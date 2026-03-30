require('dotenv').config();
// Force IPv4 — Docker containers may not have IPv6 routing to external hosts
require('dns').setDefaultResultOrder('ipv4first');

// ─── Sentry (must be initialised before any other imports) ───────────────────
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const expireBookingsJob = require('./jobs/expireBookings');
const keepAliveJob = require('./jobs/keepAlive');
const { authenticate, authorize } = require('./middleware/auth');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const stationsRoutes = require('./modules/stations/stations.routes');
const routesRoutes = require('./modules/routes/routes.routes');
const busesRoutes = require('./modules/buses/buses.routes');
const schedulesRoutes = require('./modules/schedules/schedules.routes');
const bookingsRoutes = require('./modules/bookings/bookings.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const ticketsRoutes = require('./modules/tickets/tickets.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const agenciesRoutes = require('./modules/agencies/agencies.routes');

const app = express();

// ─── Security headers ────────────────────────
// crossOriginResourcePolicy must be 'cross-origin' for a CORS API consumed by browsers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── Environment ─────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

// ─── CORS — fail closed if origin not whitelisted ────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Allow any Vercel deployment for this project (preview + production)
const vercelPreviewPattern = /^https:\/\/tega-rwa[a-z0-9-]*\.vercel\.app$/;

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin)
    if (!origin) return cb(null, true);
    // In development, allow any localhost origin regardless of port
    if (isDev && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    // Allow Vercel preview deployments for this project
    if (vercelPreviewPattern.test(origin)) return cb(null, true);
    // In production, enforce the explicit whitelist
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── Rate limiting ────────────────────────────

// Global — 1000 req / 15 min (dev), 300 (prod) — env var overrides prod only
const globalMax = isDev ? 1000 : (parseInt(process.env.RATE_LIMIT_MAX) || 300);
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: globalMax,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Auth endpoints — 100 req / 15 min (dev), 20 (prod)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

// Booking/payment creation — 60 req / hour (dev), 30 (prod), POST only via route-level middleware
// Applied per-method in the route files, NOT here, to avoid throttling GET /bookings/my

// ─── Parsing and compression ──────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(compression());

// ─── Logging ─────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ─── Health check (no env info leaked) ───────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Documentation (admin-only in production) ────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'TEGA.Rw API Docs',
  }));
} else {
  app.use('/api/docs', authenticate, authorize('admin'), swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'TEGA.Rw API Docs',
  }));
}

// ─── Routes ───────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, usersRoutes);
app.use(`${API}/stations`, stationsRoutes);
app.use(`${API}/routes`, routesRoutes);
app.use(`${API}/buses`, busesRoutes);
app.use(`${API}/schedules`, schedulesRoutes);
app.use(`${API}/bookings`, bookingsRoutes);
app.use(`${API}/payments`, paymentsRoutes);
app.use(`${API}/tickets`, ticketsRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/agencies`, agenciesRoutes);

// ─── 404 & Error handlers ─────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`TEGA.Rw API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`API Docs: http://localhost:${PORT}/api/docs`);
  }
  expireBookingsJob.start();
  keepAliveJob.start();
});

module.exports = app;
