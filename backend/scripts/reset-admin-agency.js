/**
 * Lists all admin/agency users and resets their passwords.
 * Usage:
 *   node scripts/reset-admin-agency.js            -- list only
 *   node scripts/reset-admin-agency.js reset       -- reset to defaults
 *
 * Default passwords after reset:
 *   admin  → Admin@1234
 *   agency → Agency@1234
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('../src/config/database');

async function main() {
  const shouldReset = process.argv[2] === 'reset';

  // List admin/agency users
  const { rows } = await query(
    `SELECT id, full_name, phone_number, email, role, is_active, failed_login_attempts, locked_until
     FROM users WHERE role IN ('admin','agency') ORDER BY role, full_name`
  );

  if (!rows.length) {
    console.log('No admin or agency users found in the database.');
    await pool.end();
    return;
  }

  console.log('\n── Admin / Agency users ──────────────────────────────────────');
  rows.forEach(u => {
    const locked = u.locked_until && new Date(u.locked_until) > new Date()
      ? ` LOCKED until ${new Date(u.locked_until).toISOString()}`
      : '';
    console.log(
      `[${u.role.toUpperCase()}] ${u.full_name}\n` +
      `  phone: ${u.phone_number}  email: ${u.email || '—'}\n` +
      `  active: ${u.is_active}  failed_attempts: ${u.failed_login_attempts}${locked}\n`
    );
  });

  if (!shouldReset) {
    console.log('Run with "reset" argument to reset passwords and unlock accounts.');
    console.log('  node scripts/reset-admin-agency.js reset');
    await pool.end();
    return;
  }

  // Reset passwords
  const passwords = { admin: 'Admin@1234', agency: 'Agency@1234' };
  for (const u of rows) {
    const plainPw = passwords[u.role];
    const hash = await bcrypt.hash(plainPw, 12);
    await query(
      `UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, is_active = true
       WHERE id = $2`,
      [hash, u.id]
    );
    console.log(`✓ Reset ${u.role} "${u.full_name}" (${u.phone_number}) → password: ${plainPw}`);
  }

  console.log('\nDone. You can now log in with the phone number shown above.');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
