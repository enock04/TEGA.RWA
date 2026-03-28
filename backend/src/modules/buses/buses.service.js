const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../../config/database');

const getAllBuses = async ({ page = 1, limit = 20, busType, search, agencyId } = {}) => {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE b.is_active = true';

  if (agencyId) {
    params.push(agencyId);
    where += ` AND b.agency_id = $${params.length}`;
  }
  if (busType) {
    params.push(busType);
    where += ` AND b.bus_type = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (b.name ILIKE $${params.length} OR b.plate_number ILIKE $${params.length})`;
  }

  params.push(limit, offset);
  const result = await query(
    `SELECT b.*, a.name AS agency_name
     FROM buses b
     LEFT JOIN agencies a ON a.id = b.agency_id
     ${where} ORDER BY b.name LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const count = await query(`SELECT COUNT(*) FROM buses b ${where}`, params.slice(0, -2));
  return { buses: result.rows, total: parseInt(count.rows[0].count), page, limit };
};

const getBusById = async (id) => {
  const result = await query(
    `SELECT b.*, a.name AS agency_name
     FROM buses b LEFT JOIN agencies a ON a.id = b.agency_id
     WHERE b.id = $1 AND b.is_active = true`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Bus not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const getBusSeats = async (busId, scheduleId) => {
  const result = await query(
    `SELECT s.id, s.seat_number, s.seat_class, s.position,
            CASE WHEN b.id IS NOT NULL THEN 'booked' ELSE 'available' END AS status
     FROM seats s
     LEFT JOIN bookings bk ON bk.schedule_id = $2
       AND bk.seat_id = s.id
       AND bk.status IN ('confirmed', 'pending')
     LEFT JOIN bookings b ON b.id = bk.id
     WHERE s.bus_id = $1
     ORDER BY s.seat_number`,
    [busId, scheduleId]
  );
  return result.rows;
};

const createBus = async ({ name, plateNumber, busType, totalSeats, agencyId, amenities, seatLayout, _enforcedAgencyId }) => {
  // Agency staff can only create buses for their own agency
  const resolvedAgencyId = _enforcedAgencyId || agencyId || null;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const busId = uuidv4();

    await client.query(
      `INSERT INTO buses (id, name, plate_number, bus_type, total_seats, agency_id, amenities)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [busId, name, plateNumber, busType || 'standard', totalSeats, resolvedAgencyId, JSON.stringify(amenities || [])]
    );

    // Generate seats
    const seatRows = [];
    for (let i = 1; i <= totalSeats; i++) {
      const seatId = uuidv4();
      const seatClass = seatLayout?.find(s => s.seatNumber === i)?.class || 'economy';
      seatRows.push(`('${seatId}', '${busId}', ${i}, '${seatClass}')`);
    }

    if (seatRows.length > 0) {
      await client.query(
        `INSERT INTO seats (id, bus_id, seat_number, seat_class) VALUES ${seatRows.join(', ')}`
      );
    }

    await client.query('COMMIT');
    return getBusById(busId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const updateBus = async (id, data, agencyId = null) => {
  if (agencyId) {
    const ownership = await query('SELECT id FROM buses WHERE id = $1 AND agency_id = $2 AND is_active = true', [id, agencyId]);
    if (!ownership.rows.length) { const err = new Error('Bus not found or access denied'); err.statusCode = 403; throw err; }
  }
  const fieldMap = {
    name: 'name',
    plateNumber: 'plate_number',
    busType: 'bus_type',
    agencyId: 'agency_id',
    amenities: 'amenities',
  };

  const fields = [];
  const params = [];

  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined && fieldMap[key]) {
      params.push(key === 'amenities' ? JSON.stringify(val) : val);
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
    `UPDATE buses SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} AND is_active = true RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Bus not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const deleteBus = async (id, agencyId = null) => {
  if (agencyId) {
    const ownership = await query('SELECT id FROM buses WHERE id = $1 AND agency_id = $2 AND is_active = true', [id, agencyId]);
    if (!ownership.rows.length) { const err = new Error('Bus not found or access denied'); err.statusCode = 403; throw err; }
  }
  await query('UPDATE buses SET is_active = false WHERE id = $1', [id]);
};

module.exports = { getAllBuses, getBusById, getBusSeats, createBus, updateBus, deleteBus };
