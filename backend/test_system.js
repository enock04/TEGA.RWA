// Quick end-to-end system test — covers the full booking flow
// Run with: node test_system.js

const http = require('http');

let passed = 0;
let failed = 0;

// ─── HTTP helper ──────────────────────────────────────────────────────────────
const req = (method, path, body, token) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const options = {
    hostname: 'localhost',
    port: 5000,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };
  const r = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
      catch { resolve({ status: res.statusCode, body: data }); }
    });
  });
  r.on('error', reject);
  if (payload) r.write(payload);
  r.end();
});

const check = (label, condition, detail = '') => {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else           { console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); failed++; }
};

// ─── Run ──────────────────────────────────────────────────────────────────────
const run = async () => {
  console.log('\n═══════════════════════════════════════');
  console.log('  IBTRS System Test');
  console.log('═══════════════════════════════════════\n');

  // 1. Health
  console.log('[ 1 ] Health check');
  const health = await req('GET', '/health');
  check('Server is up',   health.status === 200);
  check('Status is ok',   health.body.status === 'ok');

  // 2. Register
  console.log('\n[ 2 ] User registration');
  const phone = `+2507${Date.now().toString().slice(-8)}`;
  const reg = await req('POST', '/api/v1/auth/register', {
    fullName: 'Test Passenger', phoneNumber: phone, password: 'Test@1234',
  });
  check('Returns 201',          reg.status === 201,                           `got ${reg.status}`);
  check('Has access token',     !!reg.body.data?.accessToken);
  check('User phone matches',   reg.body.data?.user?.phone_number === phone);
  const token = reg.body.data?.accessToken;

  // 3. Login
  console.log('\n[ 3 ] Login');
  const login = await req('POST', '/api/v1/auth/login', { phoneNumber: phone, password: 'Test@1234' });
  check('Returns 200',      login.status === 200,            `got ${login.status}`);
  check('Has access token', !!login.body.data?.accessToken);
  const loginToken = login.body.data?.accessToken || token;

  // 4. Auth security
  console.log('\n[ 4 ] Auth security');
  const badLogin = await req('POST', '/api/v1/auth/login', { phoneNumber: phone, password: 'WrongPass' });
  check('Wrong password → 401', badLogin.status === 401, `got ${badLogin.status}`);

  // 5. Profile
  console.log('\n[ 5 ] Profile');
  const profile = await req('GET', '/api/v1/auth/profile', null, loginToken);
  check('Returns 200',             profile.status === 200,                          `got ${profile.status}`);
  check('No password_hash leaked', !profile.body.data?.user?.password_hash);
  check('Correct phone number',    profile.body.data?.user?.phone_number === phone);

  // 6. Stations
  console.log('\n[ 6 ] Stations');
  const stations = await req('GET', '/api/v1/stations', null, loginToken);
  check('Returns 200',       stations.status === 200,                              `got ${stations.status}`);
  const stationList = stations.body.data?.stations || [];
  check('Has stations',      stationList.length >= 1,                              `got ${stationList.length}`);

  // 7. Bus search — use first two distinct stations from a real route
  console.log('\n[ 7 ] Bus search');
  const routesRes = await req('GET', '/api/v1/routes', null, loginToken);
  const routeList = routesRes.body.data?.routes || [];
  const firstRoute = routeList[0];
  let scheduleId = null;

  if (firstRoute) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const search = await req('GET',
      `/api/v1/routes/search?departureStationId=${firstRoute.departure_station_id}&destinationStationId=${firstRoute.arrival_station_id}&date=${tomorrow}`,
      null, loginToken);
    check('Search returns 200',      search.status === 200,                              `got ${search.status}`);
    check('Returns schedules array', Array.isArray(search.body.data?.schedules));
    scheduleId = search.body.data?.schedules?.[0]?.schedule_id;
    check('At least one schedule',   !!scheduleId,                                       'no future schedules found');
  } else {
    check('Routes exist',            false, 'no routes in DB');
    check('Schedules found',         false, 'skipped');
    check('Schedule ID retrieved',   false, 'skipped');
  }

  // 8. Seats
  console.log('\n[ 8 ] Seat availability');
  let seatId = null;
  if (scheduleId) {
    const schedDetail = await req('GET', `/api/v1/schedules/${scheduleId}`, null, loginToken);
    check('Schedule detail 200', schedDetail.status === 200, `got ${schedDetail.status}`);
    const busId = schedDetail.body.data?.schedule?.bus_id;
    if (busId) {
      const seatList = await req('GET', `/api/v1/buses/${busId}/seats`, null, loginToken);
      check('Seats endpoint 200', seatList.status === 200, `got ${seatList.status}`);
      seatId = seatList.body.data?.seats?.[0]?.id;
      check('Has available seats', !!seatId);
    } else {
      check('Bus found on schedule', false, 'no bus_id');
      check('Has available seats',   false, 'skipped');
    }
  } else {
    check('Schedule detail 200',  false, 'skipped');
    check('Has available seats',  false, 'skipped');
  }

  // 9. Booking — try seats in order until one isn't already taken
  console.log('\n[ 9 ] Booking');
  let bookingId = null;
  if (scheduleId && seatId) {
    // Fetch all seats so we can fall back if seat[0] is already booked
    const busDetailRes = await req('GET', `/api/v1/schedules/${scheduleId}`, null, loginToken);
    const busId2 = busDetailRes.body.data?.schedule?.bus_id;
    const allSeatsRes = await req('GET', `/api/v1/buses/${busId2}/seats`, null, loginToken);
    const allSeats = allSeatsRes.body.data?.seats || [];

    let booking = null;
    for (const seat of allSeats) {
      const attempt = await req('POST', '/api/v1/bookings', {
        scheduleId, seatId: seat.id, passengerName: 'Test Passenger', passengerPhone: phone,
      }, loginToken);
      if (attempt.status === 201) { booking = attempt; break; }
      if (attempt.status !== 409) { booking = attempt; break; } // unexpected error — stop
    }
    check('Returns 201',       booking?.status === 201,                           `got ${booking?.status}: ${booking?.body?.message || ''}`);
    bookingId = booking?.body?.data?.booking?.id;
    check('Has booking ID',    !!bookingId);
    check('Status is pending', booking?.body?.data?.booking?.status === 'pending');
    check('Amount is set',     (booking?.body?.data?.booking?.amount || 0) > 0);
  } else {
    ['Returns 201', 'Has booking ID', 'Status is pending', 'Amount is set']
      .forEach(l => check(l, false, 'skipped'));
  }

  // 10. Payment initiation
  console.log('\n[ 10 ] Payment');
  let paymentId = null;
  if (bookingId) {
    const pay = await req('POST', '/api/v1/payments/initiate', {
      bookingId, method: 'mtn_momo', payerPhone: phone,
    }, loginToken);
    check('Initiation returns 201',       pay.status === 201,                           `got ${pay.status}: ${pay.body.message || ''}`);
    paymentId = pay.body.data?.paymentId;
    check('Has payment ID',               !!paymentId);
    check('Has provider reference',       !!pay.body.data?.providerReference);
  } else {
    ['Initiation returns 201', 'Has payment ID', 'Has provider reference']
      .forEach(l => check(l, false, 'skipped'));
  }

  // 11. Payment confirmation
  console.log('\n[ 11 ] Payment confirmation');
  if (paymentId) {
    const confirm = await req('POST', `/api/v1/payments/${paymentId}/confirm`, {}, loginToken);
    check('Confirmation returns 200',  confirm.status === 200,                           `got ${confirm.status}`);
    check('Payment status completed',  confirm.body.data?.payment?.status === 'completed');
  } else {
    ['Confirmation returns 200', 'Booking now confirmed'].forEach(l => check(l, false, 'skipped'));
  }

  // 12. Ticket
  console.log('\n[ 12 ] Ticket');
  if (bookingId) {
    const ticket = await req('GET', `/api/v1/tickets/${bookingId}`, null, loginToken);
    check('Returns 200',        ticket.status === 200,                            `got ${ticket.status}`);
    check('Has ticket number',  !!ticket.body.data?.ticket?.ticket_number);
    check('Has QR code',        !!ticket.body.data?.ticket?.qr_code_data);
    check('is_used is false',   ticket.body.data?.ticket?.is_used === false);
  } else {
    ['Returns 200', 'Has ticket number', 'Has QR code', 'is_used is false']
      .forEach(l => check(l, false, 'skipped'));
  }

  // 13. Booking history
  console.log('\n[ 13 ] Booking history');
  const history = await req('GET', '/api/v1/bookings/my', null, loginToken);
  check('Returns 200',           history.status === 200,                          `got ${history.status}`);
  check('Contains new booking',  (history.body.data?.bookings?.length || 0) >= 1);

  // 14. Forgot password
  console.log('\n[ 14 ] Forgot password');
  const forgot = await req('POST', '/api/v1/auth/forgot-password', { phoneNumber: phone });
  check('Returns 200',            forgot.status === 200, `got ${forgot.status}`);
  check('No token in response',   !forgot.body.data?.token);

  // 15. Auth protection
  console.log('\n[ 15 ] Auth protection');
  const noAuth   = await req('GET', '/api/v1/bookings/my');
  const adminReq = await req('GET', '/api/v1/admin/dashboard', null, loginToken);
  check('Unauthenticated → 401',       noAuth.status === 401,    `got ${noAuth.status}`);
  check('Passenger blocked from admin', adminReq.status === 403, `got ${adminReq.status}`);

  // ─── Results ────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${passed}/${total} passed`);
  if (failed > 0) console.log(`  Failed:  ${failed}`);
  console.log('═══════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
};

run().catch(err => {
  console.error('Test runner crashed:', err.message);
  process.exit(1);
});
