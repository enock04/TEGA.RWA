const { expirePendingBookings } = require('../modules/bookings/bookings.service');
const logger = require('../utils/logger');

const INTERVAL_MS = 2 * 60 * 1000; // run every 2 minutes

const run = async () => {
  try {
    const count = await expirePendingBookings();
    if (count > 0) {
      logger.info(`[ExpireJob] Expired ${count} pending booking(s) and released seats back to schedule`);
    }
  } catch (err) {
    logger.error('[ExpireJob] Error during booking expiry:', err.message);
  }
};

const start = () => {
  logger.info('[ExpireJob] Booking expiry job started (interval: 2 min)');
  run(); // run once immediately on startup to catch any stale bookings
  return setInterval(run, INTERVAL_MS);
};

module.exports = { start };
