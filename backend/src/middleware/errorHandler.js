const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
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
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({ success: false, message });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
};

module.exports = { errorHandler, notFoundHandler };
