const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');
const { sendWelcomeEmail } = require('../../utils/notifications');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Normalise a Rwandan phone number to E.164 (+250XXXXXXXXX) for DB lookup.
// Accepts: +250788…, 250788…, 0788…, 788… (9 digits)
const normalisePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('250') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+250${digits.slice(1)}`;
  if (digits.length === 9) return `+250${digits}`;
  return phone;
};

const generateTokens = (userId, role) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  // Use separate secrets for access vs refresh tokens
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
  const refreshToken = jwt.sign(
    { userId },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
};

const register = async ({ fullName, phoneNumber, email, password, role = 'passenger' }) => {
  const normPhone = normalisePhone(phoneNumber.trim());
  const phoneCheck = await query('SELECT id FROM users WHERE phone_number = $1 OR phone_number = $2', [phoneNumber.trim(), normPhone]);
  if (phoneCheck.rows.length) {
    const err = new Error('This phone number is already registered');
    err.statusCode = 409;
    throw err;
  }

  if (email) {
    const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length) {
      const err = new Error('This email address is already registered');
      err.statusCode = 409;
      throw err;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  const result = await query(
    `INSERT INTO users (id, full_name, phone_number, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, full_name, phone_number, email, role, created_at`,
    [id, fullName, normPhone, email || null, passwordHash, role]
  );

  const user = result.rows[0];
  const tokens = generateTokens(user.id, user.role);

  // Fire-and-forget welcome email (only for passengers who provided an email)
  if (user.email) {
    sendWelcomeEmail({ to: user.email, fullName: user.full_name }).catch(err => {
      const logger = require('./../../utils/logger');
      logger.error(`[AUTH] Welcome email failed for ${user.email}: ${err.message}`, { stack: err.stack });
    });
  }

  return { user, ...tokens };
};

const login = async ({ phoneNumber, password }) => {
  const normalisedPhone = normalisePhone(phoneNumber.trim());
  // Try both the submitted value and the normalised E.164 form so users can
  // log in with any format (0788…, +250788…, 250788…).
  const result = await query(
    `SELECT id, full_name, phone_number, email, password_hash, role, is_active,
            failed_login_attempts, locked_until
     FROM users WHERE phone_number = $1 OR phone_number = $2`,
    [phoneNumber.trim(), normalisedPhone]
  );

  if (!result.rows.length) {
    // Use same timing as a real check to prevent timing-based enumeration
    await bcrypt.compare(password, '$2b$12$notarealuserhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    const err = new Error('Invalid phone number or password');
    err.statusCode = 401;
    throw err;
  }

  const user = result.rows[0];

  if (!user.is_active) {
    const err = new Error('Account is deactivated. Contact support.');
    err.statusCode = 403;
    throw err;
  }

  // Check account lockout
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    const err = new Error(`Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`);
    err.statusCode = 429;
    throw err;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    // Increment failed attempts; lock if threshold reached
    const attempts = (user.failed_login_attempts || 0) + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = NOW() + ($2 * INTERVAL \'1 minute\') WHERE id = $3',
        [attempts, LOCKOUT_MINUTES, user.id]
      );
    } else {
      await query('UPDATE users SET failed_login_attempts = $1 WHERE id = $2', [attempts, user.id]);
    }
    const err = new Error('Invalid phone number or password');
    err.statusCode = 401;
    throw err;
  }

  // Reset failed attempts on successful login
  const tokens = generateTokens(user.id, user.role);
  await query(
    'UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [user.id]
  );

  const { password_hash, failed_login_attempts, locked_until, ...safeUser } = user;
  return { user: safeUser, ...tokens };
};

const refreshToken = async (token) => {
  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, refreshSecret);
    const result = await query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!result.rows.length || !result.rows[0].is_active) {
      throw new Error('User not found or inactive');
    }
    const user = result.rows[0];
    return generateTokens(user.id, user.role);
  } catch {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!isValid) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $2', [newHash, userId]);
};

const forgotPassword = async (phoneNumber) => {
  const result = await query('SELECT id FROM users WHERE phone_number = $1', [phoneNumber]);
  if (!result.rows.length) {
    return; // Don't reveal whether the number exists
  }
  const userId = result.rows[0].id;
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, used = false',
    [userId, token, expiresAt]
  );
  return token; // Logged server-side; sent via SMS in production
};

const resetPassword = async (token, newPassword) => {
  const result = await query(
    'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = false',
    [token]
  );
  if (!result.rows.length) {
    const err = new Error('Invalid or expired reset token');
    err.statusCode = 400;
    throw err;
  }
  const userId = result.rows[0].user_id;
  const newHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $2', [newHash, userId]);
  await query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]);
};

module.exports = { register, login, refreshToken, changePassword, forgotPassword, resetPassword };
