const express = require('express');
const { body, query } = require('express-validator');
const controller = require('./users.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 */
router.get('/profile', authenticate, controller.getProfile);

router.put('/profile',
  authenticate,
  [
    body('fullName').optional().trim().isLength({ min: 2, max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
  ],
  validate,
  controller.updateProfile
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Users]
 */
router.get('/', authenticate, authorize('admin'), controller.getAllUsers);

router.patch('/:id/status',
  authenticate,
  authorize('admin'),
  [body('isActive').isBoolean().withMessage('isActive must be boolean')],
  validate,
  controller.toggleUserStatus
);

module.exports = router;
