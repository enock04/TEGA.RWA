const express = require('express');
const { body, query } = require('express-validator');
const controller = require('./routes.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /routes/search:
 *   get:
 *     summary: Search available bus schedules
 *     tags: [Routes]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: departureStationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: destinationStationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-04-15"
 */
router.get('/search', controller.search);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

router.post('/',
  authenticate,
  authorize('admin', 'agency'),
  [
    body('name').trim().notEmpty(),
    body('departureStationId').isUUID(),
    body('arrivalStationId').isUUID(),
    body('distanceKm').optional().isFloat({ min: 0 }),
    body('durationMinutes').optional().isInt({ min: 0 }),
  ],
  validate,
  controller.create
);

router.put('/:id', authenticate, authorize('admin', 'agency'), controller.update);
router.delete('/:id', authenticate, authorize('admin'), controller.remove);

module.exports = router;
