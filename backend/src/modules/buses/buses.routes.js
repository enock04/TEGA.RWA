const express = require('express');
const { body } = require('express-validator');
const controller = require('./buses.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /buses:
 *   get:
 *     summary: Get all buses
 *     tags: [Buses]
 *     security: []
 * /buses/available:
 *   get:
 *     summary: Get available buses for a route and date
 *     tags: [Buses]
 *     security: []
 */
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/:id/seats', controller.getSeats);

router.post('/',
  authenticate,
  authorize('admin', 'agency'),
  [
    body('name').trim().notEmpty(),
    body('plateNumber').trim().notEmpty(),
    body('totalSeats').isInt({ min: 1, max: 100 }),
    body('busType').optional().isIn(['standard', 'luxury', 'minibus', 'coach']),
  ],
  validate,
  controller.create
);

router.put('/:id',
  authenticate,
  authorize('admin', 'agency'),
  [
    body('name').optional().trim().notEmpty().withMessage('Bus name cannot be empty'),
    body('plateNumber').optional().trim().notEmpty().withMessage('Plate number cannot be empty'),
    body('totalSeats').optional().isInt({ min: 1, max: 100 }).withMessage('Total seats must be between 1 and 100'),
    body('busType').optional().isIn(['standard', 'luxury', 'minibus', 'coach']).withMessage('Invalid bus type'),
  ],
  validate,
  controller.update
);
router.delete('/:id', authenticate, authorize('admin'), controller.remove);

module.exports = router;
