const { query } = require('../../config/database');

const getProfile = async (userId) => {
  const result = await query(
    'SELECT id, full_name, phone_number, email, role, is_active, created_at, last_login_at FROM users WHERE id = $1',
    [userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const updateProfile = async (userId, { fullName, email }) => {
  if (email) {
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, userId]
    );
    if (existing.rows.length) {
      const err = new Error('Email already in use');
      err.statusCode = 409;
      throw err;
    }
  }

  const result = await query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         email = COALESCE($2, email),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, full_name, phone_number, email, role, updated_at`,
    [fullName || null, email || null, userId]
  );
  return result.rows[0];
};

const getAllUsers = async ({ page = 1, limit = 20, role, search }) => {
  const safeLimit = Math.min(parseInt(limit) || 20, 100); // cap at 100
  const offset = (page - 1) * safeLimit;
  const params = [];
  let where = 'WHERE 1=1';

  if (role) {
    params.push(role);
    where += ` AND role = $${params.length}`;
  }

  if (search) {
    const safeSearch = String(search).slice(0, 50); // prevent long query strings
    params.push(`%${safeSearch}%`);
    where += ` AND (full_name ILIKE $${params.length} OR phone_number ILIKE $${params.length})`;
  }

  params.push(safeLimit, offset);
  const result = await query(
    `SELECT id, full_name, phone_number, email, role, is_active, created_at, last_login_at
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countResult = await query(`SELECT COUNT(*) FROM users ${where}`, params.slice(0, -2));
  return {
    users: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
};

const setUserStatus = async (userId, isActive) => {
  const result = await query(
    'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, is_active',
    [isActive, userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const updateUser = async (userId, { fullName, email, role }) => {
  if (email) {
    const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
    if (existing.rows.length) {
      const err = new Error('Email already in use'); err.statusCode = 409; throw err;
    }
  }
  const result = await query(
    `UPDATE users
     SET full_name  = COALESCE($1, full_name),
         email      = COALESCE($2, email),
         role       = COALESCE($3, role),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, full_name, phone_number, email, role, is_active, created_at`,
    [fullName || null, email || null, role || null, userId]
  );
  if (!result.rows.length) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return result.rows[0];
};

const createAgent = async ({ fullName, phoneNumber, email, password }) => {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');

  const existing = await query(
    'SELECT id FROM users WHERE phone_number = $1',
    [phoneNumber]
  );
  if (existing.rows.length) {
    const err = new Error('Phone number already in use');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (id, full_name, phone_number, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, 'agency')
     RETURNING id, full_name, phone_number, email, role, is_active, created_at`,
    [uuidv4(), fullName, phoneNumber, email || null, passwordHash]
  );
  return result.rows[0];
};

module.exports = { getProfile, updateProfile, getAllUsers, setUserStatus, createAgent, updateUser };
