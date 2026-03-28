const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const service = require('./agencies.service');
const { success, created } = require('../../utils/response');

const router = express.Router();

// Limit public application submissions — 5 per hour per IP
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many applications, please try again later.' },
});

// ─── Public: submit application ───────────────────────────────────────────────
router.post('/apply',
  applyLimiter,
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('contactName').trim().notEmpty().withMessage('Contact name is required'),
    body('contactPhone').trim().notEmpty().matches(/^\+?[0-9]{10,15}$/).withMessage('Invalid phone number'),
    body('contactEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('fleetSize').optional().isInt({ min: 1 }).withMessage('Fleet size must be a positive integer'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const app = await service.submitApplication(req.body);
      return created(res, { application: app }, 'Application submitted. We will review it within 2–3 business days.');
    } catch (err) { next(err); }
  }
);

// ─── Admin: list applications ──────────────────────────────────────────────────
router.get('/applications',
  authenticate, authorize('admin'),
  async (req, res, next) => {
    try {
      const { page, limit, status } = req.query;
      const result = await service.listApplications({ page: parseInt(page) || 1, limit: parseInt(limit) || 20, status });
      return success(res, result);
    } catch (err) { next(err); }
  }
);

// ─── Admin: approve application ───────────────────────────────────────────────
router.post('/applications/:id/approve',
  authenticate, authorize('admin'),
  async (req, res, next) => {
    try {
      const result = await service.approveApplication(req.params.id, req.user.id);
      return success(res, { agency: result.agency }, 'Agency approved and account created');
    } catch (err) { next(err); }
  }
);

// ─── Admin: reject application ────────────────────────────────────────────────
router.post('/applications/:id/reject',
  authenticate, authorize('admin'),
  [body('reason').optional().trim()],
  validate,
  async (req, res, next) => {
    try {
      const app = await service.rejectApplication(req.params.id, req.user.id, req.body.reason);
      return success(res, { application: app }, 'Application rejected');
    } catch (err) { next(err); }
  }
);

module.exports = router;
