const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { getByBooking, getByNumber, validate, getAll } = require('./tickets.controller');

router.get('/',                        authenticate, authorize('admin', 'agency'), getAll);
router.get('/number/:ticketNumber',    authenticate, getByNumber);
router.post('/validate/:ticketNumber', authenticate, authorize('admin', 'agency'), validate);
router.get('/:bookingId',              authenticate, getByBooking);

module.exports = router;
