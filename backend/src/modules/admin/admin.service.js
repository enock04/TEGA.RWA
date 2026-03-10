const { query } = require('../../config/database');

const getDashboard = async () => {
  const [bookingStats, revenueResult, busCount, routeCount, recentBookings, topRoutes] = await Promise.all([
    query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      COUNT(*) FILTER (WHERE status = 'expired') AS expired,
      COUNT(DISTINCT user_id) AS passengers
    FROM bookings`),
    query(`SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM bookings WHERE status = 'confirmed'`),
    query('SELECT COUNT(*) FROM buses'),
    query('SELECT COUNT(*) FROM routes'),
    query(`SELECT bk.id, bk.status, bk.amount, bk.created_at,
                  bk.passenger_name, bk.passenger_phone,
                  s.seat_number, r.name AS route_name, sc.departure_time
           FROM bookings bk
           JOIN seats s ON s.id = bk.seat_id
           JOIN schedules sc ON sc.id = bk.schedule_id
           JOIN routes r ON r.id = sc.route_id
           ORDER BY bk.created_at DESC LIMIT 5`),
    query(`SELECT r.name AS route_name,
                  COUNT(bk.id) AS total_bookings,
                  COALESCE(SUM(bk.amount) FILTER (WHERE bk.status = 'confirmed'), 0) AS revenue
           FROM routes r
           LEFT JOIN schedules sc ON sc.route_id = r.id
           LEFT JOIN bookings bk ON bk.schedule_id = sc.id
           GROUP BY r.id, r.name
           ORDER BY total_bookings DESC LIMIT 5`),
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

const getReports = async ({ from, to } = {}) => {
  const params = [];
  let dateFilter = '';
  if (from) { params.push(from); dateFilter += ` AND DATE(bk.created_at) >= $${params.length}`; }
  if (to)   { params.push(to);   dateFilter += ` AND DATE(bk.created_at) <= $${params.length}`; }

  const [summary, byRoute, daily] = await Promise.all([
    query(`SELECT
      COUNT(*) AS total_bookings,
      COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) AS total_revenue
    FROM bookings bk WHERE 1=1 ${dateFilter}`, params),
    query(`SELECT r.name AS route_name,
                  COUNT(bk.id) AS bookings,
                  COALESCE(SUM(bk.amount) FILTER (WHERE bk.status = 'confirmed'), 0) AS revenue
           FROM routes r
           LEFT JOIN schedules sc ON sc.route_id = r.id
           LEFT JOIN bookings bk ON bk.schedule_id = sc.id
           WHERE 1=1 ${dateFilter}
           GROUP BY r.id, r.name ORDER BY revenue DESC`, params),
    query(`SELECT DATE(bk.created_at) AS date,
                  COUNT(*) AS bookings,
                  COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) AS revenue
           FROM bookings bk WHERE 1=1 ${dateFilter}
           GROUP BY DATE(bk.created_at) ORDER BY date DESC LIMIT 30`, params),
  ]);

  return { summary: summary.rows[0], byRoute: byRoute.rows, daily: daily.rows };
};

module.exports = { getDashboard, getReports };
