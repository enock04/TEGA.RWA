const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

const getAllSchedules = async ({ page = 1, limit = 20, routeId, date, status, agencyId } = {}) => {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (agencyId) {
    params.push(agencyId);
    where += ` AND b.agency_id = $${params.length}`;
  }
  if (routeId) {
    params.push(routeId);
    where += ` AND s.route_id = $${params.length}`;
  }
  if (date) {
    params.push(date);
    where += ` AND DATE(s.departure_time) = $${params.length}`;
  }
  if (status) {
    params.push(status);
    where += ` AND s.status = $${params.length}`;
  }

  params.push(limit, offset);
  const result = await query(
    `SELECT s.*,
            b.name AS bus_name, b.plate_number,
            r.name AS route_name,
            dep.name AS departure_station,
            arr.name AS arrival_station
     FROM schedules s
     JOIN buses b ON b.id = s.bus_id
     JOIN routes r ON r.id = s.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     ${where}
     ORDER BY s.departure_time
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const count = await query(`SELECT COUNT(*) FROM schedules s ${where}`, params.slice(0, -2));
  return { schedules: result.rows, total: parseInt(count.rows[0].count), page, limit };
};

const getScheduleById = async (id) => {
  const result = await query(
    `SELECT s.*,
            b.name AS bus_name, b.plate_number, b.bus_type, b.amenities,
            r.name AS route_name, r.distance_km, r.duration_minutes,
            dep.name AS departure_station, dep.city AS departure_city,
            arr.name AS arrival_station, arr.city AS arrival_city
     FROM schedules s
     JOIN buses b ON b.id = s.bus_id
     JOIN routes r ON r.id = s.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     WHERE s.id = $1`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Schedule not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const createSchedule = async ({ busId, routeId, departureTime, arrivalTime, basePrice, totalSeats, agencyId }) => {
  if (agencyId) {
    const owns = await query('SELECT id FROM buses WHERE id = $1 AND agency_id = $2 AND is_active = true', [busId, agencyId]);
    if (!owns.rows.length) { const err = new Error('Bus not found or access denied'); err.statusCode = 403; throw err; }
  }
  // Check no duplicate schedule for same bus and time
  const conflict = await query(
    `SELECT id FROM schedules
     WHERE bus_id = $1 AND status != 'cancelled'
     AND (departure_time, arrival_time) OVERLAPS ($2::timestamptz, $3::timestamptz)`,
    [busId, departureTime, arrivalTime]
  );
  if (conflict.rows.length) {
    const err = new Error('Bus already has a schedule during this time');
    err.statusCode = 409;
    throw err;
  }

  // Get total seats from bus if not provided
  let seats = totalSeats;
  if (!seats) {
    const busResult = await query('SELECT total_seats FROM buses WHERE id = $1', [busId]);
    seats = busResult.rows[0]?.total_seats || 0;
  }

  const id = uuidv4();
  const result = await query(
    `INSERT INTO schedules (id, bus_id, route_id, departure_time, arrival_time, base_price, total_seats, available_seats)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
    [id, busId, routeId, departureTime, arrivalTime, basePrice, seats]
  );
  return result.rows[0];
};

const updateSchedule = async (id, data, agencyId = null) => {
  if (agencyId) {
    const owns = await query(
      'SELECT s.id FROM schedules s JOIN buses b ON b.id = s.bus_id WHERE s.id = $1 AND b.agency_id = $2',
      [id, agencyId]
    );
    if (!owns.rows.length) { const err = new Error('Schedule not found or access denied'); err.statusCode = 403; throw err; }
  }
  const fieldMap = {
    departureTime: 'departure_time',
    arrivalTime: 'arrival_time',
    basePrice: 'base_price',
    status: 'status',
  };

  const fields = [];
  const params = [];

  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined && fieldMap[key]) {
      params.push(val);
      fields.push(`${fieldMap[key]} = $${params.length}`);
    }
  });

  if (!fields.length) {
    const err = new Error('No fields to update');
    err.statusCode = 400;
    throw err;
  }

  params.push(id);
  const result = await query(
    `UPDATE schedules SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Schedule not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const cancelSchedule = async (id, agencyId = null) => {
  if (agencyId) {
    const owns = await query(
      'SELECT s.id FROM schedules s JOIN buses b ON b.id = s.bus_id WHERE s.id = $1 AND b.agency_id = $2',
      [id, agencyId]
    );
    if (!owns.rows.length) { const err = new Error('Schedule not found or access denied'); err.statusCode = 403; throw err; }
  }
  const result = await query(
    `UPDATE schedules SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING id`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Schedule not found');
    err.statusCode = 404;
    throw err;
  }
};

module.exports = { getAllSchedules, getScheduleById, createSchedule, updateSchedule, cancelSchedule };
