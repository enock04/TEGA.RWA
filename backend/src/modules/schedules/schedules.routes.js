const express = require('express');
const { body } = require('express-validator');
const controller = require('./schedules.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /schedules:
 *   get:
 *     summary: Get all schedules
 *     tags: [Schedules]
 *     security: []
 *   post:
 *     summary: Create a new schedule
 *     tags: [Schedules]
 */
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

router.post('/',
  authenticate,
  authorize('admin', 'agency'),
  [
    body('busId').isUUID(),
    body('routeId').isUUID(),
    body('departureTime').isISO8601(),
    body('arrivalTime').isISO8601(),
    body('basePrice').isFloat({ min: 0 }),
  ],
  validate,
  controller.create
);

router.put('/:id',
  authenticate,
  authorize('admin', 'agency'),
  [
    body('departureTime').optional().isISO8601(),
    body('arrivalTime').optional().isISO8601(),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['active', 'cancelled', 'completed', 'delayed']),
  ],
  validate,
  controller.update
);

router.delete('/:id', authenticate, authorize('admin', 'agency'), controller.cancel);

module.exports = router;
