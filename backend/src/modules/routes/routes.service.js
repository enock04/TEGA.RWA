const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

const searchRoutes = async ({ departureStationId, destinationStationId, date }) => {
  const result = await query(
    `SELECT
       s.id AS schedule_id,
       s.departure_time,
       s.arrival_time,
       s.base_price,
       s.available_seats,
       s.total_seats,
       s.status AS schedule_status,
       b.id AS bus_id,
       b.plate_number,
       b.name AS bus_name,
       b.bus_type,
       b.amenities,
       r.id AS route_id,
       r.name AS route_name,
       r.distance_km,
       r.duration_minutes,
       dep.id AS departure_station_id,
       dep.name AS departure_station,
       dep.city AS departure_city,
       arr.id AS arrival_station_id,
       arr.name AS arrival_station,
       arr.city AS arrival_city
     FROM schedules s
     JOIN buses b ON b.id = s.bus_id
     JOIN routes r ON r.id = s.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     WHERE r.departure_station_id = $1
       AND r.arrival_station_id = $2
       AND DATE(s.departure_time) = $3
       AND s.status = 'active'
       AND s.available_seats > 0
       AND b.is_active = true
     ORDER BY s.departure_time`,
    [departureStationId, destinationStationId, date]
  );
  return result.rows;
};

const getAllRoutes = async ({ page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT r.*, dep.name AS departure_station, arr.name AS arrival_station
     FROM routes r
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     WHERE r.is_active = true
     ORDER BY r.name
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const count = await query('SELECT COUNT(*) FROM routes WHERE is_active = true');
  return { routes: result.rows, total: parseInt(count.rows[0].count), page, limit };
};

const getRouteById = async (id) => {
  const result = await query(
    `SELECT r.*, dep.name AS departure_station, dep.city AS departure_city,
            arr.name AS arrival_station, arr.city AS arrival_city
     FROM routes r
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     WHERE r.id = $1 AND r.is_active = true`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Route not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const createRoute = async ({ name, departureStationId, arrivalStationId, distanceKm, durationMinutes, description }) => {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO routes (id, name, departure_station_id, arrival_station_id, distance_km, duration_minutes, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, name, departureStationId, arrivalStationId, distanceKm || null, durationMinutes || null, description || null]
  );
  return result.rows[0];
};

const updateRoute = async (id, data) => {
  const fieldMap = {
    name: 'name',
    departureStationId: 'departure_station_id',
    arrivalStationId: 'arrival_station_id',
    distanceKm: 'distance_km',
    durationMinutes: 'duration_minutes',
    description: 'description',
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
    `UPDATE routes SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} AND is_active = true RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Route not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const deleteRoute = async (id) => {
  await query('UPDATE routes SET is_active = false WHERE id = $1', [id]);
};

module.exports = { searchRoutes, getAllRoutes, getRouteById, createRoute, updateRoute, deleteRoute };
