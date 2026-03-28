const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');
const { generateQRCode, generateTicketQRData } = require('../../utils/qrcode');
const { sendTicketEmail, sendBookingConfirmationSMS } = require('../../utils/notifications');
const logger = require('../../utils/logger');

// Generate a human-readable ticket number: TKT-YYYYMMDD-XXXX
const generateTicketNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${date}-${rand}`;
};

const issueTicket = async (bookingId) => {
  // Idempotent — return existing ticket if already issued
  const existing = await query(
    `SELECT t.*, bk.passenger_name, bk.passenger_phone, bk.passenger_email,
            bk.special_assistance,
            s.seat_number, sc.departure_time, sc.arrival_time,
            b.name AS bus_name, b.plate_number,
            r.name AS route_name,
            dep.name AS departure_station, arr.name AS arrival_station,
            bk.amount
     FROM tickets t
     JOIN bookings bk ON bk.id = t.booking_id
     JOIN seats s ON s.id = bk.seat_id
     JOIN schedules sc ON sc.id = bk.schedule_id
     JOIN buses b ON b.id = sc.bus_id
     JOIN routes r ON r.id = sc.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     WHERE t.booking_id = $1`,
    [bookingId]
  );

  if (existing.rows.length) {
    return existing.rows[0];
  }

  // Verify booking is confirmed
  const bookingResult = await query(
    `SELECT bk.*, s.seat_number, s.seat_class,
            sc.departure_time, sc.arrival_time,
            b.name AS bus_name, b.plate_number,
            r.name AS route_name,
            dep.name AS departure_station, dep.city AS departure_city,
            arr.name AS arrival_station, arr.city AS arrival_city,
            bk.amount
     FROM bookings bk
     JOIN seats s ON s.id = bk.seat_id
     JOIN schedules sc ON sc.id = bk.schedule_id
     JOIN buses b ON b.id = sc.bus_id
     JOIN routes r ON r.id = sc.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     WHERE bk.id = $1`,
    [bookingId]
  );

  if (!bookingResult.rows.length) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  const booking = bookingResult.rows[0];

  if (booking.status !== 'confirmed') {
    const err = new Error(`Cannot issue ticket for a ${booking.status} booking. Payment must be completed first.`);
    err.statusCode = 400;
    throw err;
  }

  // Generate QR code
  const qrData = generateTicketQRData({
    id: bookingId,
    passenger_name: booking.passenger_name,
    bus_plate: booking.plate_number,
    route_name: booking.route_name,
    departure_time: booking.departure_time,
    seat_number: booking.seat_number,
  });

  const qrCodeDataUrl = await generateQRCode(qrData);
  const ticketNumber = generateTicketNumber();
  const ticketId = uuidv4();

  await query(
    `INSERT INTO tickets (id, booking_id, ticket_number, qr_code_data)
     VALUES ($1, $2, $3, $4)`,
    [ticketId, bookingId, ticketNumber, qrCodeDataUrl]
  );

  // Send notifications (fire-and-forget — don't block ticket response)
  const departureFormatted = new Date(booking.departure_time).toLocaleString('en-RW', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Kigali',
  });

  if (booking.passenger_email) {
    sendTicketEmail({
      to: booking.passenger_email,
      passengerName: booking.passenger_name,
      bookingId,
      busName: booking.bus_name,
      route: `${booking.departure_station} → ${booking.arrival_station}`,
      departureTime: departureFormatted,
      seatNumber: `#${booking.seat_number}`,
      qrCodeDataUrl,
    }).catch(err => logger.error('Ticket email failed:', err));
  }

  sendBookingConfirmationSMS(booking.passenger_phone, {
    bookingId: ticketNumber,
    busName: booking.bus_name,
    departureTime: departureFormatted,
    seatNumber: `#${booking.seat_number}`,
  }).catch(err => logger.error('Ticket SMS failed:', err));

  return getTicketByBooking(bookingId);
};

const getTicketByBooking = async (bookingId) => {
  const result = await query(
    `SELECT t.*,
            bk.user_id, bk.passenger_name, bk.passenger_phone, bk.passenger_email,
            bk.amount, bk.status AS booking_status,
            s.seat_number, s.seat_class,
            sc.departure_time, sc.arrival_time,
            b.name AS bus_name, b.plate_number,
            r.name AS route_name,
            dep.name AS departure_station, dep.city AS departure_city,
            arr.name AS arrival_station, arr.city AS arrival_city
     FROM tickets t
     JOIN bookings bk ON bk.id = t.booking_id
     JOIN seats s ON s.id = bk.seat_id
     JOIN schedules sc ON sc.id = bk.schedule_id
     JOIN buses b ON b.id = sc.bus_id
     JOIN routes r ON r.id = sc.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     WHERE t.booking_id = $1`,
    [bookingId]
  );

  if (!result.rows.length) {
    // Try to issue it if booking is confirmed
    return issueTicket(bookingId);
  }

  return result.rows[0];
};

const getTicketByNumber = async (ticketNumber) => {
  const result = await query(
    `SELECT t.*,
            bk.passenger_name, bk.passenger_phone,
            s.seat_number, sc.departure_time,
            b.name AS bus_name, b.plate_number,
            r.name AS route_name,
            dep.name AS departure_station, arr.name AS arrival_station
     FROM tickets t
     JOIN bookings bk ON bk.id = t.booking_id
     JOIN seats s ON s.id = bk.seat_id
     JOIN schedules sc ON sc.id = bk.schedule_id
     JOIN buses b ON b.id = sc.bus_id
     JOIN routes r ON r.id = sc.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     WHERE t.ticket_number = $1`,
    [ticketNumber]
  );

  if (!result.rows.length) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
};

const validateTicket = async (ticketNumber) => {
  const ticket = await getTicketByNumber(ticketNumber);

  if (ticket.is_used) {
    return { valid: false, reason: 'Ticket has already been used', ticket };
  }

  const departureTime = new Date(ticket.departure_time);
  const now = new Date();
  const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

  if (hoursUntilDeparture < -2) {
    return { valid: false, reason: 'Journey has already departed', ticket };
  }

  // Mark as used
  await query(
    'UPDATE tickets SET is_used = true, used_at = NOW() WHERE ticket_number = $1',
    [ticketNumber]
  );

  return { valid: true, reason: 'Ticket validated successfully', ticket };
};

const getAllTickets = async ({ page = 1, limit = 20, date } = {}) => {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (date) {
    params.push(date);
    where += ` AND DATE(sc.departure_time) = $${params.length}`;
  }

  params.push(limit, offset);

  const result = await query(
    `SELECT t.ticket_number, t.is_used, t.issued_at,
            bk.passenger_name, bk.passenger_phone, s.seat_number,
            b.name AS bus_name, r.name AS route_name,
            sc.departure_time
     FROM tickets t
     JOIN bookings bk ON bk.id = t.booking_id
     JOIN seats s ON s.id = bk.seat_id
     JOIN schedules sc ON sc.id = bk.schedule_id
     JOIN buses b ON b.id = sc.bus_id
     JOIN routes r ON r.id = sc.route_id
     ${where}
     ORDER BY t.issued_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const count = await query(
    `SELECT COUNT(*) FROM tickets t
     JOIN schedules sc ON sc.id = (SELECT schedule_id FROM bookings WHERE id = t.booking_id)
     ${where}`,
    params.slice(0, -2)
  );

  return { tickets: result.rows, total: parseInt(count.rows[0].count), page, limit };
};

const resendTicket = async (bookingId, requestingUserId) => {
  const ticket = await getTicketByBooking(bookingId);

  // Only the booking owner or admin/agency can resend
  if (requestingUserId !== null) {
    const ownerCheck = await query('SELECT user_id FROM bookings WHERE id = $1', [bookingId]);
    if (ownerCheck.rows.length && ownerCheck.rows[0].user_id !== requestingUserId) {
      const err = new Error('Unauthorized to resend this ticket');
      err.statusCode = 403;
      throw err;
    }
  }

  const departureFormatted = new Date(ticket.departure_time).toLocaleString('en-RW', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Kigali',
  });

  const notifications = [];

  if (ticket.passenger_email) {
    notifications.push(
      sendTicketEmail({
        to: ticket.passenger_email,
        passengerName: ticket.passenger_name,
        bookingId,
        busName: ticket.bus_name,
        route: `${ticket.departure_station} → ${ticket.arrival_station}`,
        departureTime: departureFormatted,
        seatNumber: `#${ticket.seat_number}`,
        qrCodeDataUrl: ticket.qr_code_data,
      }).catch(err => logger.error('Ticket resend email failed:', err))
    );
  }

  notifications.push(
    sendBookingConfirmationSMS(ticket.passenger_phone, {
      bookingId: ticket.ticket_number,
      busName: ticket.bus_name,
      departureTime: departureFormatted,
      seatNumber: `#${ticket.seat_number}`,
    }).catch(err => logger.error('Ticket resend SMS failed:', err))
  );

  await Promise.all(notifications);
  return { ticketNumber: ticket.ticket_number, sent: true };
};

module.exports = { issueTicket, getTicketByBooking, getTicketByNumber, validateTicket, getAllTickets, resendTicket };
