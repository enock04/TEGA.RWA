const { query } = require('../../config/database');

const getDashboard = async ({ agencyId } = {}) => {
  const p = agencyId ? [agencyId] : [];
  const aw = agencyId ? 'AND b.agency_id = $1' : '';

  const [bookingStats, revenueResult, busCount, routeCount, recentBookings, topRoutes] = await Promise.all([
    query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE bk.status = 'confirmed') AS confirmed,
        COUNT(*) FILTER (WHERE bk.status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE bk.status = 'cancelled') AS cancelled,
        COUNT(*) FILTER (WHERE bk.status = 'expired') AS expired,
        COUNT(DISTINCT bk.user_id) AS passengers
       FROM bookings bk
       ${agencyId ? 'JOIN schedules sc2 ON sc2.id = bk.schedule_id JOIN buses b ON b.id = sc2.bus_id' : ''}
       WHERE 1=1 ${aw}`, p),
    query(
      `SELECT COALESCE(SUM(bk.amount), 0) AS total_revenue
       FROM bookings bk
       ${agencyId ? 'JOIN schedules sc2 ON sc2.id = bk.schedule_id JOIN buses b ON b.id = sc2.bus_id' : ''}
       WHERE bk.status = 'confirmed' ${aw}`, p),
    query(`SELECT COUNT(*) FROM buses ${agencyId ? 'WHERE agency_id = $1' : ''}`, p),
    query(
      `SELECT COUNT(*) FROM routes r
       ${agencyId ? 'WHERE r.id IN (SELECT DISTINCT sc.route_id FROM schedules sc JOIN buses b ON b.id = sc.bus_id WHERE b.agency_id = $1)' : ''}`, p),
    query(
      `SELECT bk.id, bk.status, bk.amount, bk.created_at,
              bk.passenger_name, bk.passenger_phone,
              s.seat_number, r.name AS route_name, sc.departure_time
       FROM bookings bk
       JOIN seats s ON s.id = bk.seat_id
       JOIN schedules sc ON sc.id = bk.schedule_id
       JOIN buses b ON b.id = sc.bus_id
       JOIN routes r ON r.id = sc.route_id
       WHERE 1=1 ${aw}
       ORDER BY bk.created_at DESC LIMIT 5`, p),
    query(
      `SELECT r.name AS route_name,
              COUNT(bk.id) AS total_bookings,
              COALESCE(SUM(bk.amount) FILTER (WHERE bk.status = 'confirmed'), 0) AS revenue
       FROM routes r
       LEFT JOIN schedules sc ON sc.route_id = r.id
       LEFT JOIN buses b ON b.id = sc.bus_id
       LEFT JOIN bookings bk ON bk.schedule_id = sc.id
       WHERE 1=1 ${aw}
       GROUP BY r.id, r.name
       ORDER BY total_bookings DESC LIMIT 5`, p),
  ]);

  const stats = bookingStats.rows[0];
  return {
    stats: {
      totalBookings: parseInt(stats.total),
      confirmed: parseInt(stats.confirmed),
      pending: parseInt(stats.pending),
      cancelled: parseInt(stats.cancelled),
      expired: parseInt(stats.expired),
      passengers: parseInt(stats.passengers),
      totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
      totalBuses: parseInt(busCount.rows[0].count),
      totalRoutes: parseInt(routeCount.rows[0].count),
    },
    recentBookings: recentBookings.rows,
    topRoutes: topRoutes.rows,
  };
};

const getReports = async ({ from, to, agencyId } = {}) => {
  const params = [];
  // All queries join through schedules → buses when agencyId is set
  // using the same params array and consistent $N indices
  const agencyJoin = agencyId
    ? 'JOIN schedules sc_a ON sc_a.id = bk.schedule_id JOIN buses b_a ON b_a.id = sc_a.bus_id'
    : '';
  let where = 'WHERE 1=1';
  if (agencyId) { params.push(agencyId); where += ` AND b_a.agency_id = $${params.length}`; }
  if (from)     { params.push(from);     where += ` AND DATE(bk.created_at) >= $${params.length}`; }
  if (to)       { params.push(to);       where += ` AND DATE(bk.created_at) <= $${params.length}`; }

  const [summary, byRoute, daily] = await Promise.all([
    query(`SELECT
      COUNT(*) AS total_bookings,
      COUNT(*) FILTER (WHERE bk.status = 'confirmed') AS confirmed,
      COUNT(*) FILTER (WHERE bk.status = 'cancelled') AS cancelled,
      COALESCE(SUM(bk.amount) FILTER (WHERE bk.status = 'confirmed'), 0) AS total_revenue
    FROM bookings bk ${agencyJoin} ${where}`, params),
    query(`SELECT r.name AS route_name,
                  COUNT(bk.id) AS bookings,
                  COALESCE(SUM(bk.amount) FILTER (WHERE bk.status = 'confirmed'), 0) AS revenue
           FROM routes r
           LEFT JOIN schedules sc ON sc.route_id = r.id
           LEFT JOIN buses b_a ON b_a.id = sc.bus_id
           LEFT JOIN bookings bk ON bk.schedule_id = sc.id
           ${where}
           GROUP BY r.id, r.name ORDER BY revenue DESC`, params),
    query(`SELECT DATE(bk.created_at) AS date,
                  COUNT(*) AS bookings,
                  COALESCE(SUM(bk.amount) FILTER (WHERE bk.status = 'confirmed'), 0) AS revenue
           FROM bookings bk ${agencyJoin} ${where}
           GROUP BY DATE(bk.created_at) ORDER BY date DESC LIMIT 30`, params),
  ]);

  return { summary: summary.rows[0], byRoute: byRoute.rows, daily: daily.rows };
};

// ─── Agency Management ────────────────────────────────────────────────────────

const getAgencies = async ({ page = 1, limit = 20, search } = {}) => {
  const safeLimit = Math.min(parseInt(limit) || 20, 100);
  const offset = (page - 1) * safeLimit;
  const params = [];
  let where = 'WHERE 1=1';

  if (search) {
    const s = String(search).slice(0, 50);
    params.push(`%${s}%`);
    where += ` AND (a.name ILIKE $${params.length} OR a.registration_no ILIKE $${params.length} OR a.contact_email ILIKE $${params.length})`;
  }

  params.push(safeLimit, offset);
  const result = await query(
    `SELECT a.*,
            COUNT(DISTINCT b.id) AS total_buses
     FROM agencies a
     LEFT JOIN buses b ON b.agency_id = a.id
     ${where}
     GROUP BY a.id
     ORDER BY a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countResult = await query(`SELECT COUNT(*) FROM agencies a ${where}`, params.slice(0, -2));
  return {
    agencies: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: safeLimit,
  };
};

const getAgencyById = async (id) => {
  const result = await query(
    `SELECT a.*,
            COUNT(DISTINCT b.id) AS total_buses
     FROM agencies a
     LEFT JOIN buses b ON b.agency_id = a.id
     WHERE a.id = $1
     GROUP BY a.id`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Agency not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

const createAgency = async ({ name, registrationNo, contactPhone, contactEmail, address, logoUrl }) => {
  if (!name || !name.trim()) {
    const err = new Error('Agency name is required');
    err.statusCode = 400;
    throw err;
  }

  if (registrationNo) {
    const existing = await query('SELECT id FROM agencies WHERE registration_no = $1', [registrationNo]);
    if (existing.rows.length) {
      const err = new Error('Registration number already in use');
      err.statusCode = 409;
      throw err;
    }
  }

  const result = await query(
    `INSERT INTO agencies (name, registration_no, contact_phone, contact_email, address, logo_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name.trim(), registrationNo || null, contactPhone || null, contactEmail || null, address || null, logoUrl || null]
  );
  return result.rows[0];
};

const updateAgency = async (id, { name, registrationNo, contactPhone, contactEmail, address, logoUrl }) => {
  const existing = await query('SELECT id FROM agencies WHERE id = $1', [id]);
  if (!existing.rows.length) {
    const err = new Error('Agency not found');
    err.statusCode = 404;
    throw err;
  }

  if (registrationNo) {
    const conflict = await query('SELECT id FROM agencies WHERE registration_no = $1 AND id != $2', [registrationNo, id]);
    if (conflict.rows.length) {
      const err = new Error('Registration number already in use');
      err.statusCode = 409;
      throw err;
    }
  }

  const result = await query(
    `UPDATE agencies
     SET name            = COALESCE($1, name),
         registration_no = COALESCE($2, registration_no),
         contact_phone   = COALESCE($3, contact_phone),
         contact_email   = COALESCE($4, contact_email),
         address         = COALESCE($5, address),
         logo_url        = COALESCE($6, logo_url),
         updated_at      = NOW()
     WHERE id = $7
     RETURNING *`,
    [name?.trim() || null, registrationNo || null, contactPhone || null, contactEmail || null, address || null, logoUrl || null, id]
  );
  return result.rows[0];
};

const toggleAgencyStatus = async (id, isActive) => {
  const result = await query(
    'UPDATE agencies SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, is_active',
    [isActive, id]
  );
  if (!result.rows.length) {
    const err = new Error('Agency not found');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

// ─── CSV Export ───────────────────────────────────────────────────────────────

const exportBookingsCSV = async ({ from, to, agencyId } = {}) => {
  const params = [];
  let where = 'WHERE 1=1';

  if (agencyId) { params.push(agencyId); where += ` AND b.agency_id = $${params.length}`; }
  if (from)     { params.push(from);     where += ` AND DATE(bk.created_at) >= $${params.length}`; }
  if (to)       { params.push(to);       where += ` AND DATE(bk.created_at) <= $${params.length}`; }

  const result = await query(
    `SELECT bk.id,
            bk.status,
            bk.amount,
            bk.passenger_name,
            bk.passenger_phone,
            bk.passenger_email,
            s.seat_number,
            r.name AS route_name,
            dep.name AS from_station,
            arr.name AS to_station,
            sc.departure_time,
            b.name AS bus_name,
            b.plate_number,
            a.name AS agency_name,
            bk.created_at,
            bk.refund_status
     FROM bookings bk
     JOIN seats s ON s.id = bk.seat_id
     JOIN schedules sc ON sc.id = bk.schedule_id
     JOIN buses b ON b.id = sc.bus_id
     LEFT JOIN agencies a ON a.id = b.agency_id
     JOIN routes r ON r.id = sc.route_id
     JOIN stations dep ON dep.id = r.departure_station_id
     JOIN stations arr ON arr.id = r.arrival_station_id
     ${where}
     ORDER BY bk.created_at DESC`,
    params
  );

  return result.rows;
};

const toCSV = (rows) => {
  if (!rows.length) return '';
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\r\n');
};

module.exports = {
  getDashboard, getReports, getAgencies, getAgencyById, createAgency, updateAgency, toggleAgencyStatus,
  exportBookingsCSV, toCSV,
};
