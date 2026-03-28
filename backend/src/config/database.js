const { Pool } = require('pg');

const isSupabase = process.env.DB_HOST && (
  process.env.DB_HOST.includes('supabase.co') ||
  process.env.DB_HOST.includes('pooler.supabase.com')
);

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX) || 25,
  min: 2,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 10000,
  statement_timeout:       30000,  // 30 s max per query
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('Database connected');
  }
});

pool.on('error', (err) => {
  // Log but don't crash — idle client errors are non-fatal
  console.error('Unexpected database pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
