const express = require('express');
const { body } = require('express-validator');
const controller = require('./payments.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate a mobile money payment for a booking
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, method, payerPhone]
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *               method:
 *                 type: string
 *                 enum: [mtn_momo, airtel_money]
 *               payerPhone:
 *                 type: string
 *                 example: "+250788000000"
 *     responses:
 *       201:
 *         description: Payment initiated, prompt sent to phone
 *       400:
 *         description: Booking not in pending state
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Payment already in progress
 */
router.post('/initiate',
  authenticate,
  [
    body('bookingId').matches(/^[0-9a-f-]{36}$/i).withMessage('Invalid booking ID'),
    body('method')
      .isIn(['mtn_momo', 'airtel_money'])
      .withMessage('Method must be mtn_momo or airtel_money'),
    body('payerPhone')
      .trim()
      .notEmpty()
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage('Invalid payer phone number'),
  ],
  validate,
  controller.initiate
);

/**
 * @swagger
 * /payments/{paymentId}/confirm:
 *   post:
 *     summary: Confirm a payment and activate the booking
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment confirmed, booking activated
 *       402:
 *         description: Payment not successful
 */
router.post('/:paymentId/confirm', authenticate, controller.confirm);

/**
 * @swagger
 * /payments/booking/{bookingId}:
 *   get:
 *     summary: Get payment details for a booking
 *     tags: [Payments]
 */
router.get('/booking/:bookingId', authenticate, controller.getByBooking);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: List all payments (Admin only)
 *     tags: [Payments]
 */
router.get('/', authenticate, authorize('admin', 'agency'), controller.getAll);

// Webhook secret validation middleware
const validateWebhookSecret = (req, res, next) => {
  const secret = req.headers['x-webhook-secret'];
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    // No secret configured — reject all webhook calls (fail secure)
    return res.status(403).json({ success: false, message: 'Webhook not configured' });
  }
  if (!secret || secret !== expected) {
    return res.status(403).json({ success: false, message: 'Invalid webhook secret' });
  }
  next();
};

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Payment provider webhook endpoint
 *     tags: [Payments]
 *     security: []
 *     description: Called by MTN MoMo / Airtel Money to notify payment status changes
 */
router.post('/webhook', validateWebhookSecret, controller.webhook);

module.exports = router;
