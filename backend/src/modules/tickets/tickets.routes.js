const express = require('express');
const router = express.Router();

// Placeholder — full implementation in Phase 5
router.get('/:bookingId', (req, res) => {
  res.status(503).json({ success: false, message: 'Ticket service coming soon (Phase 5)' });
});

module.exports = router;
