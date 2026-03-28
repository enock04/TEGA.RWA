const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { unauthorized, forbidden } = require('../utils/response');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Access token required');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, full_name, phone_number, email, role, is_active, agency_id FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows.length) {
      return unauthorized(res, 'User not found');
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return forbidden(res, 'Account is deactivated');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expired');
    }
    return unauthorized(res, 'Invalid token');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res);
    }
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Access denied. Required roles: ${roles.join(', ')}`);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
