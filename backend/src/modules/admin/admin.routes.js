const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { dashboard, reports, listAgencies, addAgency, getAgency, editAgency, setAgencyStatus, exportCSV } = require('./admin.controller');
const { sendEmail } = require('../../utils/notifications');

router.get('/dashboard',          authenticate, authorize('admin', 'agency'), dashboard);
router.get('/reports',            authenticate, authorize('admin', 'agency'), reports);
router.get('/reports/export',     authenticate, authorize('admin', 'agency'), exportCSV);
router.get('/agencies',           authenticate, authorize('admin'), listAgencies);
router.post('/agencies',          authenticate, authorize('admin'), addAgency);
router.get('/agencies/:id',       authenticate, authorize('admin'), getAgency);
router.put('/agencies/:id',       authenticate, authorize('admin'), editAgency);
router.patch('/agencies/:id/status', authenticate, authorize('admin'), setAgencyStatus);

// Email diagnostics — admin only
router.post('/test-email', authenticate, authorize('admin'), async (req, res) => {
  const to = req.body.to || req.user.email;
  if (!to) return res.status(400).json({ success: false, message: 'Provide a "to" email in the body' });
  try {
    await sendEmail({
      to,
      subject: 'TEGA.Rw — email test',
      html: '<p>If you see this, email delivery is working on this server.</p>',
      text: 'If you see this, email delivery is working on this server.',
    });
    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, detail: err.response?.body || err.code });
  }
});

module.exports = router;
