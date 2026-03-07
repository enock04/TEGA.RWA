const express = require('express');
const { body } = require('express-validator');
const controller = require('./bookings.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

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
  authenticate,
  [
    body('scheduleId').isUUID().withMessage('Invalid schedule ID'),
    body('seatId').isUUID().withMessage('Invalid seat ID'),
    body('passengerName').trim().notEmpty().withMessage('Passenger name is required'),
    body('passengerPhone').trim().notEmpty().matches(/^\+?[0-9]{10,15}$/).withMessage('Invalid phone number'),
    body('passengerEmail').optional().isEmail().normalizeEmail(),
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
