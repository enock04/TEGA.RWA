const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

const getAllStations = async ({ search, province } = {}) => {
  const params = [];
  let where = 'WHERE is_active = true';

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (name ILIKE $${params.length} OR city ILIKE $${params.length})`;
  }
  if (province) {
    params.push(province);
    where += ` AND province = $${params.length}`;
  }

  const result = await query(
    `SELECT id, name, city, province, address, latitude, longitude
     FROM stations ${where} ORDER BY province, name`,
    params
  );
  return result.rows;
};

const getStationById = async (id) => {
  const result = await query(
    'SELECT * FROM stations WHERE id = $1 AND is_active = true',
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Station not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const createStation = async ({ name, city, province, address, latitude, longitude }) => {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO stations (id, name, city, province, address, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, name, city, province, address || null, latitude || null, longitude || null]
  );
  return result.rows[0];
};

const updateStation = async (id, data) => {
  const fields = [];
  const params = [];

  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      params.push(val);
      fields.push(`${col} = $${params.length}`);
    }
  });

  if (!fields.length) {
    const err = new Error('No fields to update');
    err.statusCode = 400;
    throw err;
  }

  params.push(id);
  const result = await query(
    `UPDATE stations SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Station not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const deleteStation = async (id) => {
  await query('UPDATE stations SET is_active = false WHERE id = $1', [id]);
};

module.exports = { getAllStations, getStationById, createStation, updateStation, deleteStation };
