const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { dashboard, reports } = require('./admin.controller');

router.get('/dashboard', authenticate, authorize('admin', 'agency'), dashboard);
router.get('/reports',   authenticate, authorize('admin', 'agency'), reports);
router.get('/agencies',  (req, res) => res.status(503).json({ success: false, message: 'Agency management coming soon' }));
router.post('/agencies', (req, res) => res.status(503).json({ success: false, message: 'Agency management coming soon' }));

module.exports = router;
