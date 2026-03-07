const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
};

const register = async ({ fullName, phoneNumber, email, password, role = 'passenger' }) => {
  const existing = await query(
    'SELECT id FROM users WHERE phone_number = $1 OR (email IS NOT NULL AND email = $2)',
    [phoneNumber, email || null]
  );
  if (existing.rows.length) {
    const err = new Error('User with this phone number or email already exists');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  const result = await query(
    `INSERT INTO users (id, full_name, phone_number, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, full_name, phone_number, email, role, created_at`,
    [id, fullName, phoneNumber, email || null, passwordHash, role]
  );

  const user = result.rows[0];
  const tokens = generateTokens(user.id, user.role);
  return { user, ...tokens };
};

const login = async ({ phoneNumber, password }) => {
  const result = await query(
    'SELECT id, full_name, phone_number, email, password_hash, role, is_active FROM users WHERE phone_number = $1',
    [phoneNumber]
  );

  if (!result.rows.length) {
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

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const err = new Error('Invalid phone number or password');
    err.statusCode = 401;
    throw err;
  }

  const tokens = generateTokens(user.id, user.role);

  await query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, ...tokens };
};

const refreshToken = async (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
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
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
};

module.exports = { register, login, refreshToken, changePassword };
