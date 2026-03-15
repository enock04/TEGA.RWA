const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { dashboard, reports, listAgencies, addAgency, getAgency, editAgency, setAgencyStatus } = require('./admin.controller');

router.get('/dashboard',          authenticate, authorize('admin', 'agency'), dashboard);
router.get('/reports',            authenticate, authorize('admin', 'agency'), reports);
router.get('/agencies',           authenticate, authorize('admin'), listAgencies);
router.post('/agencies',          authenticate, authorize('admin'), addAgency);
router.get('/agencies/:id',       authenticate, authorize('admin'), getAgency);
router.put('/agencies/:id',       authenticate, authorize('admin'), editAgency);
router.patch('/agencies/:id/status', authenticate, authorize('admin'), setAgencyStatus);

module.exports = router;
