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

const runFile = async (client, file) => {
  const filePath = path.join(__dirname, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Running ${file}...`);
  await client.query(sql);
  console.log(`Done: ${file}`);
};

(async () => {
  const client = await pool.connect();
  try {
    await runFile(client, '001_initial.sql');
    console.log('Migration complete. Run "npm run seed" to load sample data.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
