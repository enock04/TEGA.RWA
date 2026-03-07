const paymentsService = require('./payments.service');
const { success, created } = require('../../utils/response');
const logger = require('../../utils/logger');

const initiate = async (req, res, next) => {
  try {
    const { bookingId, method, payerPhone } = req.body;
    const result = await paymentsService.initiatePayment({
      bookingId,
      userId: req.user.id,
      method,
      payerPhone,
    });
    return created(res, result, 'Payment initiated');
  } catch (err) {
    next(err);
  }
};

const confirm = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { alreadyConfirmed, payment } = await paymentsService.confirmPayment({
      paymentId,
      userId: req.user.id,
    });
    const message = alreadyConfirmed ? 'Payment already confirmed' : 'Payment confirmed. Booking is now active.';
    return success(res, { payment }, message);
  } catch (err) {
    next(err);
  }
};

const getByBooking = async (req, res, next) => {
  try {
    const payment = await paymentsService.getPaymentByBooking(req.params.bookingId, req.user.id);
    return success(res, { payment });
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page, limit, status, method, date } = req.query;
    const result = await paymentsService.getAllPayments({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      method,
      date,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

// Webhook endpoint — no auth, validated by provider signature (mock accepts all)
const webhook = async (req, res, next) => {
  try {
    const { referenceId, status, ...rest } = req.body;
    logger.info(`Webhook received: ref=${referenceId}, status=${status}`);
    await paymentsService.handleWebhook({
      providerReference: referenceId,
      status,
      rawPayload: req.body,
    });
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Webhook error:', err);
    return res.status(200).json({ received: true }); // always 200 to prevent retries
  }
};

module.exports = { initiate, confirm, getByBooking, getAll, webhook };
