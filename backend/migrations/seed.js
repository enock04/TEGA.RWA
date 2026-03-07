require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'tega_rw_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

(async () => {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, '002_seed.sql'), 'utf8');
    console.log('Seeding database...');
    await client.query(sql);
    console.log('Seed complete.');
    console.log('Default credentials:');
    console.log('  Admin  — phone: +250788000001 / password: Admin@1234');
    console.log('  Agency — phone: +250788000002 / password: Agency@1234');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
