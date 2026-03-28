const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const controller = require('./bookings.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

// POST-only transaction limiter — does not affect GET /my or GET /admin
const isDev = process.env.NODE_ENV !== 'production';
const transactionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 60 : 30,
  message: { success: false, message: 'Too many booking requests, please try again later.' },
});

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduleId, seatId, passengerName, passengerPhone]
 *             properties:
 *               scheduleId:
 *                 type: string
 *                 format: uuid
 *               seatId:
 *                 type: string
 *                 format: uuid
 *               passengerName:
 *                 type: string
 *               passengerPhone:
 *                 type: string
 *               passengerEmail:
 *                 type: string
 */
router.post('/',
  transactionLimiter,
  authenticate,
  [
    body('scheduleId').matches(/^[0-9a-f-]{36}$/i).withMessage('Invalid schedule ID'),
    body('seatId').matches(/^[0-9a-f-]{36}$/i).withMessage('Invalid seat ID'),
    body('passengerName').trim().isLength({ min: 2 }).withMessage('Passenger name must be at least 2 characters'),
    body('passengerPhone').trim().notEmpty().matches(/^\+?[0-9]{10,15}$/).withMessage('Invalid phone number'),
    body('passengerEmail').trim().isEmail().withMessage('Valid passenger email is required').toLowerCase(),
    body('specialAssistance').optional().isBoolean().toBoolean(),
  ],
  validate,
  controller.create
);

/**
 * @swagger
 * /bookings/my:
 *   get:
 *     summary: Get current user's bookings
 *     tags: [Bookings]
 */
router.post('/batch',
  transactionLimiter,
  authenticate,
  [
    body('scheduleId').matches(/^[0-9a-f-]{36}$/i).withMessage('Invalid schedule ID'),
    body('passengers').isArray({ min: 1 }).withMessage('passengers must be a non-empty array'),
    body('passengers.*.seatId').matches(/^[0-9a-f-]{36}$/i).withMessage('Invalid seat ID'),
    body('passengers.*.passengerName').trim().isLength({ min: 2 }).withMessage('Passenger name must be at least 2 characters'),
    body('passengers.*.passengerPhone').trim().matches(/^\+?[0-9]{10,15}$/).withMessage('Invalid phone number'),
    body('passengers.*.passengerEmail').trim().isEmail().withMessage('Valid passenger email is required').toLowerCase(),
    body('passengers.*.specialAssistance').optional().isBoolean().toBoolean(),
  ],
  validate,
  controller.createBatch
);

router.get('/my', authenticate, controller.getMyBookings);

/**
 * @swagger
 * /bookings/admin:
 *   get:
 *     summary: Get all bookings (Admin/Agency)
 *     tags: [Bookings]
 */
router.get('/admin', authenticate, authorize('admin', 'agency'), controller.getAll);

/**
 * @swagger
 * /bookings/{id}/summary:
 *   get:
 *     summary: Get booking summary
 *     tags: [Bookings]
 */
router.get('/:id/summary', authenticate, controller.getSummary);

router.delete('/:id', authenticate, controller.cancel);

module.exports = router;
