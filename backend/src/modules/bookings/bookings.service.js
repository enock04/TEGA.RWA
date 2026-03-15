const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../../config/database');

const BOOKING_EXPIRY_MINUTES = 15;

const createBooking = async ({ userId, scheduleId, seatId, passengerName, passengerPhone, passengerEmail }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock and check schedule availability
    const schedResult = await client.query(
      'SELECT id, available_seats, base_price, status FROM schedules WHERE id = $1 FOR UPDATE',
      [scheduleId]
    );
    if (!schedResult.rows.length) {
      const err = new Error('Schedule not found');
      err.statusCode = 404;
      throw err;
    }
    const schedule = schedResult.rows[0];
    if (schedule.status !== 'active') {
      const err = new Error('Schedule is not active');
      err.statusCode = 400;
      throw err;
    }
    if (schedule.available_seats < 1) {
      const err = new Error('No available seats on this schedule');
      err.statusCode = 409;
      throw err;
    }

    // Check if specific seat is available
    const seatCheck = await client.query(
      `SELECT id FROM bookings
       WHERE schedule_id = $1 AND seat_id = $2 AND status IN ('confirmed', 'pending')`,
      [scheduleId, seatId]
    );
    if (seatCheck.rows.length) {
      const err = new Error('Seat is already booked. Please select another seat.');
      err.statusCode = 409;
      throw err;
    }

    // Verify seat belongs to this schedule's bus
    const seatResult = await client.query(
      `SELECT s.id, s.seat_number, s.seat_class
       FROM seats s
       JOIN schedules sc ON sc.bus_id = s.bus_id
       WHERE s.id = $1 AND sc.id = $2`,
      [seatId, scheduleId]
    );
    if (!seatResult.rows.length) {
      const err = new Error('Invalid seat for this schedule');
      err.statusCode = 400;
      throw err;
    }

    const seat = seatResult.rows[0];
    const bookingId = uuidv4();
    const expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);
    const amount = parseFloat(schedule.base_price);

    await client.query(
      `INSERT INTO bookings
         (id, user_id, schedule_id, seat_id, passenger_name, passenger_phone, passenger_email,
          amount, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)`,
      [bookingId, userId, scheduleId, seatId, passengerName, passengerPhone,
       passengerEmail || null, amount, expiresAt]
    );

    // Decrement available seats
    await client.query(
      'UPDATE schedules SET available_seats = available_seats - 1 WHERE id = $1',
      [scheduleId]
    );

    await client.query('COMMIT');
    return getBookingById(bookingId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

const getAllBookings = async ({ page = 1, limit = 20, status, scheduleId, date } = {}) => {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

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
  const count = await query(`SELECT COUNT(*) FROM bookings bk JOIN schedules sc ON sc.id = bk.schedule_id ${where}`, params.slice(0, -2));
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
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const schedResult = await client.query(
      'SELECT id, available_seats, base_price, status FROM schedules WHERE id = $1 FOR UPDATE',
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

    const bookingIds = [];
    const expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);
    const amount = parseFloat(schedule.base_price);

    for (const p of passengers) {
      const seatCheck = await client.query(
        `SELECT id FROM bookings WHERE schedule_id = $1 AND seat_id = $2 AND status IN ('confirmed','pending')`,
        [scheduleId, p.seatId]
      );
      if (seatCheck.rows.length) {
        const err = new Error('One or more selected seats are already booked'); err.statusCode = 409; throw err;
      }

      const seatResult = await client.query(
        `SELECT s.id FROM seats s JOIN schedules sc ON sc.bus_id = s.bus_id WHERE s.id = $1 AND sc.id = $2`,
        [p.seatId, scheduleId]
      );
      if (!seatResult.rows.length) {
        const err = new Error('Invalid seat for this schedule'); err.statusCode = 400; throw err;
      }

      const bookingId = uuidv4();
      await client.query(
        `INSERT INTO bookings (id, user_id, schedule_id, seat_id, passenger_name, passenger_phone, passenger_email, amount, status, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)`,
        [bookingId, userId, scheduleId, p.seatId, p.passengerName, p.passengerPhone, p.passengerEmail || null, amount, expiresAt]
      );
      bookingIds.push(bookingId);
    }

    await client.query(
      'UPDATE schedules SET available_seats = available_seats - $1 WHERE id = $2',
      [passengers.length, scheduleId]
    );

    await client.query('COMMIT');
    return Promise.all(bookingIds.map(id => getBookingById(id)));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
