const express = require('express');
const { body } = require('express-validator');
const controller = require('./stations.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /stations:
 *   get:
 *     summary: Get all active stations
 *     tags: [Stations]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 */
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

router.post('/',
  authenticate,
  authorize('admin', 'agency'),
  [
    body('name').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('province').trim().notEmpty(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
  ],
  validate,
  controller.create
);

router.put('/:id',
  authenticate,
  authorize('admin', 'agency'),
  [
    body('name').optional().trim().notEmpty(),
    body('city').optional().trim().notEmpty(),
    body('province').optional().trim().notEmpty(),
  ],
  validate,
  controller.update
);

router.delete('/:id', authenticate, authorize('admin'), controller.remove);

module.exports = router;
