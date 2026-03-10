const logger = require('../utils/logger');

const SENSITIVE_FIELDS = ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'accessToken'];

const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) sanitized[field] = '[REDACTED]';
  }
  return sanitized;
};

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    body: sanitizeBody(req.body),
  });

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry: resource already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Invalid reference: related resource not found' });
  }
  if (err.code === '23502') {
    return res.status(400).json({ success: false, message: 'Required field missing' });
  }

  const statusCode = err.statusCode || 500;
  // Never leak internal error details — always use generic message for 500s
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({ success: false, message });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
};

module.exports = { errorHandler, notFoundHandler };
