const express = require('express');
const router = express.Router();

// Placeholder — full implementation in Phase 6
router.get('/dashboard', (req, res) => {
  res.status(503).json({ success: false, message: 'Admin service coming soon (Phase 6)' });
});
router.get('/reports', (req, res) => {
  res.status(503).json({ success: false, message: 'Reports service coming soon (Phase 6)' });
});
router.get('/agencies', (req, res) => {
  res.status(503).json({ success: false, message: 'Agency management coming soon (Phase 6)' });
});
router.post('/agencies', (req, res) => {
  res.status(503).json({ success: false, message: 'Agency management coming soon (Phase 6)' });
});

module.exports = router;
