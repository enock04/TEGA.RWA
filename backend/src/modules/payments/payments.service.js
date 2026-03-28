const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../../config/database');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// Mock payment providers (replace with real SDKs in production)
// ─────────────────────────────────────────────

const mockMtnMomo = async ({ amount, phoneNumber, bookingId }) => {
  logger.info(`[MTN MoMo MOCK] Initiating payment: ${amount} RWF from ${phoneNumber} for booking ${bookingId}`);
  // Simulate provider latency
  await new Promise(r => setTimeout(r, 300));

  const referenceId = uuidv4();
  return {
    referenceId,
    status: 'PENDING',
    message: 'Payment request sent to customer phone',
  };
};

const mockAirtelMoney = async ({ amount, phoneNumber, bookingId }) => {
  logger.info(`[Airtel Money MOCK] Initiating payment: ${amount} RWF from ${phoneNumber} for booking ${bookingId}`);
  await new Promise(r => setTimeout(r, 300));

  const referenceId = uuidv4();
  return {
    referenceId,
    status: 'DP_INITIATED',
    message: 'Payment request sent to customer',
  };
};

const checkMockProviderStatus = async (providerReference, method) => {
  // In production: poll MTN /collection/v1_0/requesttopay/{referenceId}
  // For MVP mock: always resolve as completed after initiation
  logger.info(`[MOCK] Checking payment status for ref: ${providerReference}`);
  return { status: 'SUCCESSFUL', providerReference };
};

// ─────────────────────────────────────────────
// Initiate payment
// ─────────────────────────────────────────────

const initiatePayment = async ({ bookingId, userId, method, payerPhone }) => {
  // Validate booking belongs to user and is in pending state
  const bookingResult = await query(
    `SELECT bk.id, bk.amount, bk.status, bk.user_id
     FROM bookings bk
     WHERE bk.id = $1`,
    [bookingId]
  );

  if (!bookingResult.rows.length) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  const booking = bookingResult.rows[0];

  if (booking.user_id !== userId) {
    const err = new Error('Unauthorized to pay for this booking');
    err.statusCode = 403;
    throw err;
  }

  if (booking.status !== 'pending') {
    const err = new Error(`Booking is already ${booking.status}. Only pending bookings can be paid.`);
    err.statusCode = 400;
    throw err;
  }

  // Check no active payment already exists
  const existingPayment = await query(
    `SELECT id FROM payments WHERE booking_id = $1 AND status IN ('pending', 'processing')`,
    [bookingId]
  );
  if (existingPayment.rows.length) {
    const err = new Error('A payment is already in progress for this booking');
    err.statusCode = 409;
    throw err;
  }

  // Call mock provider
  let providerResponse;
  const amount = parseFloat(booking.amount);

  if (method === 'mtn_momo') {
    providerResponse = await mockMtnMomo({ amount, phoneNumber: payerPhone, bookingId });
  } else if (method === 'airtel_money') {
    providerResponse = await mockAirtelMoney({ amount, phoneNumber: payerPhone, bookingId });
  } else {
    const err = new Error('Unsupported payment method for mobile money');
    err.statusCode = 400;
    throw err;
  }

  const paymentId = uuidv4();
  await query(
    `INSERT INTO payments
       (id, booking_id, user_id, amount, currency, method, status, provider_reference, provider_response)
     VALUES ($1, $2, $3, $4, 'RWF', $5, 'processing', $6, $7)`,
    [
      paymentId,
      bookingId,
      userId,
      amount,
      method,
      providerResponse.referenceId,
      JSON.stringify(providerResponse),
    ]
  );

  return {
    paymentId,
    bookingId,
    amount,
    currency: 'RWF',
    method,
    providerReference: providerResponse.referenceId,
    status: 'processing',
    message: providerResponse.message,
    instructions: method === 'mtn_momo'
      ? `A payment prompt has been sent to ${payerPhone}. Enter your MTN MoMo PIN to confirm.`
      : `A payment prompt has been sent to ${payerPhone}. Enter your Airtel Money PIN to confirm.`,
  };
};

// ─────────────────────────────────────────────
// Confirm payment (webhook / polling)
// ─────────────────────────────────────────────

const confirmPayment = async ({ paymentId, userId }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const paymentResult = await client.query(
      `SELECT p.*, bk.user_id AS booking_user_id
       FROM payments p
       JOIN bookings bk ON bk.id = p.booking_id
       WHERE p.id = $1 FOR UPDATE`,
      [paymentId]
    );

    if (!paymentResult.rows.length) {
      const err = new Error('Payment not found');
      err.statusCode = 404;
      throw err;
    }

    const payment = paymentResult.rows[0];

    if (payment.booking_user_id !== userId) {
      const err = new Error('Unauthorized');
      err.statusCode = 403;
      throw err;
    }

    if (payment.status === 'completed') {
      await client.query('ROLLBACK');
      return { alreadyConfirmed: true, payment };
    }

    if (payment.status === 'failed') {
      const err = new Error('Payment has already failed');
      err.statusCode = 400;
      throw err;
    }

    // Check with mock provider
    const providerStatus = await checkMockProviderStatus(payment.provider_reference, payment.method);

    if (providerStatus.status !== 'SUCCESSFUL') {
      await client.query(
        `UPDATE payments SET status = 'failed', failed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [paymentId]
      );
      await client.query('ROLLBACK');
      const err = new Error('Payment was not successful');
      err.statusCode = 402;
      throw err;
    }

    // Mark payment complete
    await client.query(
      `UPDATE payments
       SET status = 'completed', completed_at = NOW(), updated_at = NOW(),
           provider_response = $2
       WHERE id = $1`,
      [paymentId, JSON.stringify(providerStatus)]
    );

    // Confirm booking
    await client.query(
      `UPDATE bookings
       SET status = 'confirmed', expires_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [payment.booking_id]
    );

    await client.query('COMMIT');

    const updatedPayment = await query(
      `SELECT p.*,
              bk.passenger_name, bk.passenger_phone, bk.passenger_email,
              bk.seat_id, bk.schedule_id
       FROM payments p JOIN bookings bk ON bk.id = p.booking_id
       WHERE p.id = $1`,
      [paymentId]
    );

    return { alreadyConfirmed: false, payment: updatedPayment.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// Webhook handler (for real provider callbacks)
// ─────────────────────────────────────────────

const handleWebhook = async ({ providerReference, status, rawPayload }) => {
  const paymentResult = await query(
    `SELECT id, booking_id, status FROM payments WHERE provider_reference = $1`,
    [providerReference]
  );

  if (!paymentResult.rows.length) {
    logger.warn(`Webhook received for unknown reference: ${providerReference}`);
    return;
  }

  const payment = paymentResult.rows[0];
  if (payment.status === 'completed') return; // idempotent

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const isSuccess = ['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(status?.toUpperCase());

    await client.query(
      `UPDATE payments
       SET status = $1,
           ${isSuccess ? 'completed_at' : 'failed_at'} = NOW(),
           provider_response = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [isSuccess ? 'completed' : 'failed', JSON.stringify(rawPayload), payment.id]
    );

    if (isSuccess) {
      await client.query(
        `UPDATE bookings SET status = 'confirmed', expires_at = NULL, updated_at = NOW() WHERE id = $1`,
        [payment.booking_id]
      );
    }

    await client.query('COMMIT');
    logger.info(`Webhook processed: payment ${payment.id} → ${isSuccess ? 'completed' : 'failed'}`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Webhook processing failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// Get payment details
// ─────────────────────────────────────────────

const getPaymentByBooking = async (bookingId, userId) => {
  const result = await query(
    `SELECT p.*
     FROM payments p
     JOIN bookings bk ON bk.id = p.booking_id
     WHERE p.booking_id = $1 AND bk.user_id = $2
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [bookingId, userId]
  );
  if (!result.rows.length) {
    const err = new Error('No payment found for this booking');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const getAllPayments = async ({ page = 1, limit = 20, status, method, date } = {}) => {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (status) { params.push(status); where += ` AND p.status = $${params.length}`; }
  if (method) { params.push(method); where += ` AND p.method = $${params.length}`; }
  if (date)   { params.push(date);   where += ` AND DATE(p.created_at) = $${params.length}`; }

  params.push(limit, offset);
  const result = await query(
    `SELECT p.*, bk.passenger_name, bk.passenger_phone, u.full_name AS payer_name
     FROM payments p
     JOIN bookings bk ON bk.id = p.booking_id
     JOIN users u ON u.id = p.user_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const count = await query(`SELECT COUNT(*) FROM payments p ${where}`, params.slice(0, -2));
  return { payments: result.rows, total: parseInt(count.rows[0].count), page, limit };
};

// ─────────────────────────────────────────────
// Refund payment (mock — calls real API in production)
// ─────────────────────────────────────────────

const refundPayment = async ({ bookingId, userId, isAdmin = false }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Load booking + payment together, lock both
    const bookingResult = await client.query(
      `SELECT bk.id, bk.status, bk.user_id, bk.schedule_id, bk.refund_status,
              p.id AS payment_id, p.status AS payment_status, p.amount, p.method, p.provider_reference
       FROM bookings bk
       JOIN payments p ON p.booking_id = bk.id AND p.status = 'completed'
       WHERE bk.id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (!bookingResult.rows.length) {
      const err = new Error('No completed payment found for this booking');
      err.statusCode = 404;
      throw err;
    }

    const row = bookingResult.rows[0];

    if (!isAdmin && row.user_id !== userId) {
      const err = new Error('Unauthorized');
      err.statusCode = 403;
      throw err;
    }

    if (!['confirmed'].includes(row.status)) {
      const err = new Error(`Cannot refund a ${row.status} booking`);
      err.statusCode = 400;
      throw err;
    }

    if (row.refund_status === 'completed') {
      const err = new Error('Booking has already been refunded');
      err.statusCode = 409;
      throw err;
    }

    // ── Mock refund (replace with real provider call in production) ──
    logger.info(`[Refund MOCK] Refunding ${row.amount} RWF via ${row.method} for booking ${bookingId}`);
    await new Promise(r => setTimeout(r, 200));
    // In production: call MTN reversal or Airtel refund endpoint here

    // Mark payment as refunded
    await client.query(
      `UPDATE payments SET status = 'refunded', refunded_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [row.payment_id]
    );

    // Cancel booking + mark refund complete
    await client.query(
      `UPDATE bookings
       SET status = 'cancelled', refund_status = 'completed',
           cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [bookingId]
    );

    // Restore seat availability
    await client.query(
      'UPDATE schedules SET available_seats = available_seats + 1 WHERE id = $1',
      [row.schedule_id]
    );

    await client.query('COMMIT');

    return {
      bookingId,
      paymentId: row.payment_id,
      amount: row.amount,
      method: row.method,
      refundStatus: 'completed',
      message: 'Refund processed successfully. Funds will be returned within 3–5 business days.',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  initiatePayment,
  confirmPayment,
  handleWebhook,
  getPaymentByBooking,
  getAllPayments,
  refundPayment,
};
