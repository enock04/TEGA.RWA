const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../../config/database');

const BOOKING_EXPIRY_MINUTES = 15;

// Wrap a transaction with automatic retry on deadlock or serialization failure
const withRetry = async (fn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err.code === '40P01' || err.code === '40001'; // deadlock / serialization failure
      if (retryable && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 50 * attempt)); // brief back-off
        continue;
      }
      throw err;
    }
  }
};

const createBooking = async ({ userId, scheduleId, seatId, passengerName, passengerPhone, passengerEmail, specialAssistance = false }) => {
  return withRetry(async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // ── 1. Quick read — no lock needed yet ──────────────────────────────────
      const schedResult = await client.query(
        'SELECT id, available_seats, base_price, status FROM schedules WHERE id = $1',
        [scheduleId]
      );
      if (!schedResult.rows.length) {
        const err = new Error('Schedule not found'); err.statusCode = 404; throw err;
      }
      const schedule = schedResult.rows[0];
      if (schedule.status !== 'active') {
        const err = new Error('Schedule is not active'); err.statusCode = 400; throw err;
      }
      if (schedule.available_seats < 1) {
        const err = new Error('No available seats on this schedule'); err.statusCode = 409; throw err;
      }

      // ── 2. Lock ONLY the specific seat row (not the whole schedule) ─────────
      //    Concurrent bookings for DIFFERENT seats do not block each other.
      const seatLock = await client.query(
        `SELECT s.id, s.seat_number, s.seat_class
         FROM seats s
         JOIN schedules sc ON sc.bus_id = s.bus_id
         WHERE s.id = $1 AND sc.id = $2
         FOR UPDATE OF s`,
        [seatId, scheduleId]
      );
      if (!seatLock.rows.length) {
        const err = new Error('Invalid seat for this schedule'); err.statusCode = 400; throw err;
      }

      // ── 3. Check the seat is still free (under the seat-level lock) ─────────
      const seatCheck = await client.query(
        `SELECT id FROM bookings
         WHERE schedule_id = $1 AND seat_id = $2 AND status IN ('confirmed', 'pending')`,
        [scheduleId, seatId]
      );
      if (seatCheck.rows.length) {
        const err = new Error('Seat is already booked. Please select another seat.'); err.statusCode = 409; throw err;
      }

      // ── 4. Atomically decrement available_seats (only if > 0) ───────────────
      //    This UPDATE acquires a brief row-level lock on the schedule, much
      //    shorter than holding it for the full transaction duration.
      const seatsUpdate = await client.query(
        `UPDATE schedules SET available_seats = available_seats - 1
         WHERE id = $1 AND available_seats > 0
         RETURNING id`,
        [scheduleId]
      );
      if (!seatsUpdate.rows.length) {
        const err = new Error('No available seats on this schedule'); err.statusCode = 409; throw err;
      }

      // ── 5. Insert the booking ────────────────────────────────────────────────
      const bookingId = uuidv4();
      const expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);
      const amount = parseFloat(schedule.base_price);

      await client.query(
        `INSERT INTO bookings
           (id, user_id, schedule_id, seat_id, passenger_name, passenger_phone, passenger_email,
            special_assistance, amount, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)`,
        [bookingId, userId, scheduleId, seatId, passengerName, passengerPhone,
         passengerEmail || null, specialAssistance, amount, expiresAt]
      );

      await client.query('COMMIT');
      return getBookingById(bookingId);
    } catch (err) {
      await client.query('ROLLBACK');
      // Map DB constraint violations to friendly errors
      if (err.code === '23505') { // unique_violation — seat taken by concurrent insert
        const e = new Error('Seat is already booked. Please select another seat.');
        e.statusCode = 409;
        throw e;
      }
      throw err;
    } finally {
      client.release();
    }
  });
};

const getBookingById = async (id) => {
  const result = await query(
    `SELECT bk.*,
            s.seat_number, s.seat_class,
            sc.departure_time, sc.arrival_time, sc.base_price,
            b.name AS bus_name, b.plate_number,
            r.name AS route_name,
            dep.name AS departure_station, dep.city AS departure_city,
            arr.name AS arrival_station, arr.city AS arrival_city
     FROM bookings bk
     JOIN seats s ON s.id = bk.seat_id
     JOIN schedules sc ON sc.id = bk.schedule_id
     JOIN buses b ON b.id = sc.bus_id
     JOIN routes r ON r.id = sc.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     WHERE bk.id = $1`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const getBookingSummary = async (bookingId, userId) => {
  const booking = await getBookingById(bookingId);
  if (booking.user_id !== userId) {
    const err = new Error('Unauthorized to view this booking');
    err.statusCode = 403;
    throw err;
  }
  return booking;
};

const getUserBookings = async (userId, { page = 1, limit = 10, status } = {}) => {
  const offset = (page - 1) * limit;
  const params = [userId];
  let where = 'WHERE bk.user_id = $1';

  if (status) {
    params.push(status);
    where += ` AND bk.status = $${params.length}`;
  }

  params.push(limit, offset);
  const result = await query(
    `SELECT bk.id, bk.status, bk.amount, bk.created_at,
            bk.passenger_name, s.seat_number,
            sc.departure_time, sc.arrival_time,
            b.name AS bus_name,
            r.name AS route_name,
            dep.name AS departure_station,
            arr.name AS arrival_station
     FROM bookings bk
     JOIN seats s ON s.id = bk.seat_id
     JOIN schedules sc ON sc.id = bk.schedule_id
     JOIN buses b ON b.id = sc.bus_id
     JOIN routes r ON r.id = sc.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     ${where}
     ORDER BY bk.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const count = await query(`SELECT COUNT(*) FROM bookings bk ${where}`, params.slice(0, -2));
  return { bookings: result.rows, total: parseInt(count.rows[0].count), page, limit };
};

const cancelBooking = async (bookingId, userId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'SELECT id, status, schedule_id, user_id FROM bookings WHERE id = $1 FOR UPDATE',
      [bookingId]
    );

    if (!result.rows.length) {
      const err = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    const booking = result.rows[0];

    if (booking.user_id !== userId) {
      const err = new Error('Unauthorized');
      err.statusCode = 403;
      throw err;
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      const err = new Error('Booking cannot be cancelled in its current state');
      err.statusCode = 400;
      throw err;
    }

    await client.query(
      'UPDATE bookings SET status = $1, cancelled_at = NOW(), updated_at = NOW() WHERE id = $2',
      ['cancelled', bookingId]
    );

    // Restore seat
    await client.query(
      'UPDATE schedules SET available_seats = available_seats + 1 WHERE id = $1',
      [booking.schedule_id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getAllBookings = async ({ page = 1, limit = 20, status, scheduleId, date, agencyId } = {}) => {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (agencyId) {
    params.push(agencyId);
    where += ` AND b.agency_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    where += ` AND bk.status = $${params.length}`;
  }
  if (scheduleId) {
    params.push(scheduleId);
    where += ` AND bk.schedule_id = $${params.length}`;
  }
  if (date) {
    params.push(date);
    where += ` AND DATE(sc.departure_time) = $${params.length}`;
  }

  params.push(limit, offset);
  const result = await query(
    `SELECT bk.id, bk.status, bk.amount, bk.created_at,
            bk.passenger_name, bk.passenger_phone, s.seat_number,
            sc.departure_time, b.name AS bus_name, r.name AS route_name
     FROM bookings bk
     JOIN seats s ON s.id = bk.seat_id
     JOIN schedules sc ON sc.id = bk.schedule_id
     JOIN buses b ON b.id = sc.bus_id
     JOIN routes r ON r.id = sc.route_id
     ${where}
     ORDER BY bk.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const count = await query(`SELECT COUNT(*) FROM bookings bk JOIN schedules sc ON sc.id = bk.schedule_id JOIN buses b ON b.id = sc.bus_id JOIN routes r ON r.id = sc.route_id ${where}`, params.slice(0, -2));
  return { bookings: result.rows, total: parseInt(count.rows[0].count), page, limit };
};

// Expire pending bookings (called by cleanup job)
const expirePendingBookings = async () => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE bookings SET status = 'expired', updated_at = NOW()
       WHERE status = 'pending' AND expires_at < NOW()
       RETURNING id, schedule_id`
    );

    for (const booking of result.rows) {
      await client.query(
        'UPDATE schedules SET available_seats = available_seats + 1 WHERE id = $1',
        [booking.schedule_id]
      );
    }
    await client.query('COMMIT');
    return result.rowCount;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const createBatchBookings = async ({ userId, scheduleId, passengers }) => {
  return withRetry(async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // ── 1. Quick read — validate schedule ───────────────────────────────────
      const schedResult = await client.query(
        'SELECT id, available_seats, base_price, status FROM schedules WHERE id = $1',
        [scheduleId]
      );
      if (!schedResult.rows.length) {
        const err = new Error('Schedule not found'); err.statusCode = 404; throw err;
      }
      const schedule = schedResult.rows[0];
      if (schedule.status !== 'active') {
        const err = new Error('Schedule is not active'); err.statusCode = 400; throw err;
      }
      if (schedule.available_seats < passengers.length) {
        const err = new Error('Not enough available seats'); err.statusCode = 409; throw err;
      }

      // ── 2. Lock seat rows in consistent order (by seat ID) to prevent deadlocks
      //    when multiple batch requests overlap on some of the same seats.
      const seatIds = [...new Set(passengers.map(p => p.seatId))].sort();
      if (seatIds.length !== passengers.length) {
        const err = new Error('Duplicate seats in batch request'); err.statusCode = 400; throw err;
      }

      const seatPlaceholders = seatIds.map((_, i) => `$${i + 2}`).join(', ');
      const lockedSeats = await client.query(
        `SELECT s.id FROM seats s
         JOIN schedules sc ON sc.bus_id = s.bus_id
         WHERE sc.id = $1 AND s.id IN (${seatPlaceholders})
         ORDER BY s.id
         FOR UPDATE OF s`,
        [scheduleId, ...seatIds]
      );
      if (lockedSeats.rows.length !== seatIds.length) {
        const err = new Error('One or more seats are invalid for this schedule'); err.statusCode = 400; throw err;
      }

      // ── 3. Check all seats are free ─────────────────────────────────────────
      const takenCheck = await client.query(
        `SELECT seat_id FROM bookings
         WHERE schedule_id = $1 AND seat_id = ANY($2::uuid[]) AND status IN ('confirmed','pending')`,
        [scheduleId, seatIds]
      );
      if (takenCheck.rows.length) {
        const err = new Error('One or more selected seats are already booked'); err.statusCode = 409; throw err;
      }

      // ── 4. Atomically decrement available_seats ──────────────────────────────
      const seatsUpdate = await client.query(
        `UPDATE schedules SET available_seats = available_seats - $1
         WHERE id = $2 AND available_seats >= $1
         RETURNING id`,
        [passengers.length, scheduleId]
      );
      if (!seatsUpdate.rows.length) {
        const err = new Error('Not enough available seats'); err.statusCode = 409; throw err;
      }

      // ── 5. Insert all bookings ───────────────────────────────────────────────
      const bookingIds = [];
      const expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);
      const amount = parseFloat(schedule.base_price);

      for (const p of passengers) {
        const bookingId = uuidv4();
        await client.query(
          `INSERT INTO bookings (id, user_id, schedule_id, seat_id, passenger_name, passenger_phone,
            passenger_email, special_assistance, amount, status, expires_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)`,
          [bookingId, userId, scheduleId, p.seatId, p.passengerName, p.passengerPhone,
           p.passengerEmail || null, p.specialAssistance ?? false, amount, expiresAt]
        );
        bookingIds.push(bookingId);
      }

      await client.query('COMMIT');
      return Promise.all(bookingIds.map(id => getBookingById(id)));
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        const e = new Error('One or more selected seats are already booked');
        e.statusCode = 409;
        throw e;
      }
      throw err;
    } finally {
      client.release();
    }
  });
};

module.exports = {
  createBooking,
  createBatchBookings,
  getBookingById,
  getBookingSummary,
  getUserBookings,
  cancelBooking,
  getAllBookings,
  expirePendingBookings,
};
