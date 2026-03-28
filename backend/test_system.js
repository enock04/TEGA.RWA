/**
 * TEGA.Rw — Full System Test Suite
 * Run: node test_system.js
 * Requires backend running on localhost:5000
 */

'use strict';
const http = require('http');

let passed = 0, failed = 0, skipped = 0;
const failures = [];

// ─── HTTP helper (captures status, headers, body) ────────────────────────────
const req = (method, path, body, token) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const options = {
    hostname: 'localhost', port: 5000, path, method,
    headers: {
      'Content-Type': 'application/json',
      ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
      ...(token  && { 'Authorization': `Bearer ${token}` }),
    },
  };
  const r = http.request(options, res => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      const raw = Buffer.concat(chunks);
      let body;
      try { body = JSON.parse(raw.toString()); } catch { body = raw; }
      resolve({ status: res.statusCode, headers: res.headers, body });
    });
  });
  r.on('error', reject);
  if (payload) r.write(payload);
  r.end();
});

const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
    failures.push(`${label}${detail ? ' (' + detail + ')' : ''}`);
    failed++;
  }
};

const skip = label => { console.log(`  - ${label} (skipped)`); skipped++; };

const section = title => console.log(`\n[ ${title} ]`);

// ─── Main ────────────────────────────────────────────────────────────────────
const run = async () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║        TEGA.Rw  —  Full System Test          ║');
  console.log('╚══════════════════════════════════════════════╝');

  // ── 1. Health ───────────────────────────────────────────────────────────────
  section('1  Health check');
  const health = await req('GET', '/health');
  check('Server is up',              health.status === 200,       `got ${health.status}`);
  check('Status is ok',              health.body?.status === 'ok');
  check('Has timestamp',             !!health.body?.timestamp);

  // ── 2. Input validation ─────────────────────────────────────────────────────
  section('2  Input validation');
  const badReg = await req('POST', '/api/v1/auth/register', { fullName: '', phoneNumber: 'bad', password: '123' });
  check('Short/invalid input → 400 or 422', [400, 422].includes(badReg.status), `got ${badReg.status}`);

  const missingFields = await req('POST', '/api/v1/auth/register', { phoneNumber: '+250788000001' });
  check('Missing required fields → 4xx',    missingFields.status >= 400,         `got ${missingFields.status}`);

  // ── 3. Registration ─────────────────────────────────────────────────────────
  section('3  User registration');
  const phone = `+2507${Date.now().toString().slice(-8)}`;
  const reg = await req('POST', '/api/v1/auth/register', {
    fullName: 'Test Passenger', phoneNumber: phone, password: 'Test@1234', email: `test${Date.now()}@example.com`,
  });
  check('Returns 201',           reg.status === 201,                        `got ${reg.status}`);
  check('Has accessToken',       !!reg.body?.data?.accessToken);
  check('Has refreshToken',      !!reg.body?.data?.refreshToken);
  check('Phone matches',         reg.body?.data?.user?.phone_number === phone);
  check('No password_hash',      !reg.body?.data?.user?.password_hash);
  check('Role is passenger',     reg.body?.data?.user?.role === 'passenger');
  const token = reg.body?.data?.accessToken;
  const refreshToken = reg.body?.data?.refreshToken;

  // ── 4. Duplicate registration ───────────────────────────────────────────────
  section('4  Duplicate registration');
  const dup = await req('POST', '/api/v1/auth/register', {
    fullName: 'Dup User', phoneNumber: phone, password: 'Test@1234', email: `dup${Date.now()}@example.com`,
  });
  check('Duplicate phone → 409',  dup.status === 409, `got ${dup.status}`);

  // ── 5. Login ────────────────────────────────────────────────────────────────
  section('5  Login');
  const login = await req('POST', '/api/v1/auth/login', { phoneNumber: phone, password: 'Test@1234' });
  check('Returns 200',           login.status === 200,                      `got ${login.status}`);
  check('Has accessToken',       !!login.body?.data?.accessToken);
  check('Has refreshToken',      !!login.body?.data?.refreshToken);
  const loginToken = login.body?.data?.accessToken || token;
  const loginRefresh = login.body?.data?.refreshToken || refreshToken;

  // ── 6. Auth security ────────────────────────────────────────────────────────
  section('6  Auth security');
  const wrongPass = await req('POST', '/api/v1/auth/login', { phoneNumber: phone, password: 'BadPass!' });
  check('Wrong password → 401',  wrongPass.status === 401,                  `got ${wrongPass.status}`);

  const noAuth = await req('GET', '/api/v1/bookings/my');
  check('No token → 401',        noAuth.status === 401,                     `got ${noAuth.status}`);

  const adminRoute = await req('GET', '/api/v1/admin/dashboard', null, loginToken);
  check('Passenger → admin → 403', adminRoute.status === 403,              `got ${adminRoute.status}`);

  const adminBookings = await req('GET', '/api/v1/bookings/admin', null, loginToken);
  check('Passenger → bookings/admin → 403', adminBookings.status === 403, `got ${adminBookings.status}`);

  // ── 7. Token refresh ────────────────────────────────────────────────────────
  section('7  Token refresh');
  if (loginRefresh) {
    const refresh = await req('POST', '/api/v1/auth/refresh', { refreshToken: loginRefresh });
    check('Refresh returns 200',      refresh.status === 200,               `got ${refresh.status}`);
    check('New accessToken issued',   !!refresh.body?.data?.accessToken);
    check('New refreshToken issued',  !!refresh.body?.data?.refreshToken);
  } else {
    skip('Refresh token (no token available)');
  }

  // ── 8. Profile ──────────────────────────────────────────────────────────────
  section('8  Profile');
  const profile = await req('GET', '/api/v1/auth/profile', null, loginToken);
  check('Returns 200',           profile.status === 200,                    `got ${profile.status}`);
  check('Correct phone',         profile.body?.data?.user?.phone_number === phone);
  check('No password_hash',      !profile.body?.data?.user?.password_hash);

  // ── 9. Stations ─────────────────────────────────────────────────────────────
  section('9  Stations');
  const stationsRes = await req('GET', '/api/v1/stations', null, loginToken);
  check('Returns 200',           stationsRes.status === 200,                `got ${stationsRes.status}`);
  const stationList = stationsRes.body?.data?.stations || [];
  check('Has stations',          stationList.length >= 1,                   `got ${stationList.length}`);

  const stSearch = await req('GET', '/api/v1/stations?search=Kigali', null, loginToken);
  check('Station search works',  stSearch.status === 200);

  // ── 10. Routes ──────────────────────────────────────────────────────────────
  section('10  Routes');
  const routesRes = await req('GET', '/api/v1/routes', null, loginToken);
  check('Returns 200',           routesRes.status === 200,                  `got ${routesRes.status}`);
  const routeList = routesRes.body?.data?.routes || [];
  check('Has routes',            routeList.length >= 1,                     `got ${routeList.length}`);

  // ── 11. Schedule search ─────────────────────────────────────────────────────
  section('11  Schedule search');
  const firstRoute = routeList[0];
  let scheduleId = null;

  if (firstRoute) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const search = await req('GET',
      `/api/v1/routes/search?departureStationId=${firstRoute.departure_station_id}&destinationStationId=${firstRoute.arrival_station_id}&date=${tomorrow}`,
      null, loginToken);
    check('Search returns 200',      search.status === 200,                 `got ${search.status}`);
    check('Returns schedules array', Array.isArray(search.body?.data?.schedules));
    scheduleId = search.body?.data?.schedules?.[0]?.schedule_id;
    check('At least one schedule',   !!scheduleId,                          'no future schedules — add one in admin');
  } else {
    skip('Schedule search (no routes in DB)');
    skip('Schedule ID retrieved');
    skip('Returns schedules array');
  }

  // ── 12. Seats ───────────────────────────────────────────────────────────────
  section('12  Seat availability');
  let seatId = null, busId = null;

  if (scheduleId) {
    const schedDetail = await req('GET', `/api/v1/schedules/${scheduleId}`, null, loginToken);
    check('Schedule detail 200',   schedDetail.status === 200,              `got ${schedDetail.status}`);
    busId = schedDetail.body?.data?.schedule?.bus_id;

    if (busId) {
      const seatsRes = await req('GET', `/api/v1/buses/${busId}/seats?scheduleId=${scheduleId}`, null, loginToken);
      check('Seats endpoint 200',  seatsRes.status === 200,                 `got ${seatsRes.status}`);
      const seats = seatsRes.body?.data?.seats || [];
      seatId = seats[0]?.id;
      check('Has available seats', !!seatId,                                `${seats.length} seats found`);
    } else {
      skip('Bus found on schedule');
      skip('Has available seats');
    }
  } else {
    skip('Schedule detail');
    skip('Has available seats');
  }

  // ── 13. Create booking ──────────────────────────────────────────────────────
  section('13  Create booking');
  let bookingId = null;

  if (scheduleId && busId) {
    const allSeatsRes = await req('GET', `/api/v1/buses/${busId}/seats?scheduleId=${scheduleId}`, null, loginToken);
    const allSeats = allSeatsRes.body?.data?.seats || [];
    let bookingRes = null;

    for (const seat of allSeats) {
      const attempt = await req('POST', '/api/v1/bookings', {
        scheduleId, seatId: seat.id,
        passengerName: 'Test Passenger', passengerPhone: phone, passengerEmail: `test${Date.now()}@example.com`,
      }, loginToken);
      if (attempt.status === 201) { bookingRes = attempt; break; }
      if (attempt.status !== 409) { bookingRes = attempt; break; }
    }

    check('Returns 201',             bookingRes?.status === 201,            `got ${bookingRes?.status}: ${bookingRes?.body?.message || ''}`);
    bookingId = bookingRes?.body?.data?.booking?.id;
    check('Has booking ID',          !!bookingId);
    check('Status is pending',       bookingRes?.body?.data?.booking?.status === 'pending');
    check('Amount is set',           (bookingRes?.body?.data?.booking?.amount || 0) > 0);
    check('Has expiry time',         !!bookingRes?.body?.data?.booking?.expires_at);
  } else {
    ['Returns 201', 'Has booking ID', 'Status is pending', 'Amount is set', 'Has expiry time']
      .forEach(l => skip(l));
  }

  // ── 14. Duplicate seat booking ──────────────────────────────────────────────
  section('14  Duplicate seat prevention');
  if (bookingId && scheduleId && seatId) {
    const dup2 = await req('POST', '/api/v1/bookings', {
      scheduleId, seatId,
      passengerName: 'Another Person', passengerPhone: '+250788000099', passengerEmail: 'another@example.com',
    }, loginToken);
    check('Duplicate seat → 409',  dup2.status === 409, `got ${dup2.status}`);
  } else {
    skip('Duplicate seat prevention (no booking)');
  }

  // ── 15. Booking summary ─────────────────────────────────────────────────────
  section('15  Booking summary');
  if (bookingId) {
    const summary = await req('GET', `/api/v1/bookings/${bookingId}/summary`, null, loginToken);
    check('Returns 200',               summary.status === 200,              `got ${summary.status}`);
    check('Has booking in summary',    !!summary.body?.data?.booking);
    check('Has schedule info',         !!summary.body?.data?.schedule || !!summary.body?.data?.booking?.schedule_id);
  } else {
    skip('Booking summary (no booking)');
  }

  // ── 16. Initiate payment ────────────────────────────────────────────────────
  section('16  Payment initiation');
  let paymentId = null;

  if (bookingId) {
    const pay = await req('POST', '/api/v1/payments/initiate', {
      bookingId, method: 'mtn_momo', payerPhone: phone,
    }, loginToken);
    check('Returns 201',               pay.status === 201,                  `got ${pay.status}: ${pay.body?.message || ''}`);
    paymentId = pay.body?.data?.paymentId;
    check('Has paymentId',             !!paymentId);
    check('Has providerReference',     !!pay.body?.data?.providerReference);
  } else {
    skip('Payment initiation (no booking)');
  }

  // ── 17. Double payment prevention ───────────────────────────────────────────
  section('17  Double payment prevention');
  if (bookingId && paymentId) {
    const dup3 = await req('POST', '/api/v1/payments/initiate', {
      bookingId, method: 'airtel_money', payerPhone: phone,
    }, loginToken);
    check('Duplicate payment → 400 or 409', [400, 409].includes(dup3.status), `got ${dup3.status}`);
  } else {
    skip('Double payment prevention (no payment)');
  }

  // ── 18. Confirm payment ─────────────────────────────────────────────────────
  section('18  Payment confirmation');
  if (paymentId) {
    const confirm = await req('POST', `/api/v1/payments/${paymentId}/confirm`, {}, loginToken);
    check('Returns 200',               confirm.status === 200,              `got ${confirm.status}`);
    check('Status is completed',       confirm.body?.data?.payment?.status === 'completed');
  } else {
    skip('Payment confirmation (no paymentId)');
  }

  // ── 19. Payment lookup ──────────────────────────────────────────────────────
  section('19  Payment lookup by booking');
  if (bookingId) {
    const payLookup = await req('GET', `/api/v1/payments/booking/${bookingId}`, null, loginToken);
    check('Returns 200',               payLookup.status === 200,            `got ${payLookup.status}`);
    check('Has payment record',        !!payLookup.body?.data?.payment);
    check('Method is mtn_momo',        payLookup.body?.data?.payment?.method === 'mtn_momo');
  } else {
    skip('Payment lookup (no booking)');
  }

  // ── 20. Ticket retrieval ────────────────────────────────────────────────────
  section('20  Ticket retrieval');
  if (bookingId) {
    const ticket = await req('GET', `/api/v1/tickets/${bookingId}`, null, loginToken);
    check('Returns 200',               ticket.status === 200,               `got ${ticket.status}`);
    check('Has ticket_number',         !!ticket.body?.data?.ticket?.ticket_number);
    check('Has qr_code_data',          !!ticket.body?.data?.ticket?.qr_code_data);
    check('is_used is false',          ticket.body?.data?.ticket?.is_used === false);
    check('Has departure_station',     !!ticket.body?.data?.ticket?.departure_station);
    check('Has passenger_name',        !!ticket.body?.data?.ticket?.passenger_name);
  } else {
    skip('Ticket retrieval (no booking)');
  }

  // ── 21. PDF ticket download ─────────────────────────────────────────────────
  section('21  PDF ticket download');
  if (bookingId) {
    const pdf = await req('GET', `/api/v1/tickets/${bookingId}/pdf`, null, loginToken);
    check('Returns 200',               pdf.status === 200,                  `got ${pdf.status}`);
    check('Content-Type is PDF',       pdf.headers?.['content-type']?.includes('application/pdf'),
                                       `got ${pdf.headers?.['content-type']}`);
    check('Content-Disposition set',   !!pdf.headers?.['content-disposition']);
    check('Response is not empty',     pdf.body?.length > 100 || Buffer.isBuffer(pdf.body));
  } else {
    skip('PDF ticket download (no booking)');
  }

  // ── 22. Ticket resend ───────────────────────────────────────────────────────
  section('22  Ticket resend');
  if (bookingId) {
    const resend = await req('POST', `/api/v1/tickets/${bookingId}/resend`, {}, loginToken);
    check('Returns 200',               resend.status === 200,               `got ${resend.status}: ${resend.body?.message || ''}`);
    check('Has success message',       !!resend.body?.message);
  } else {
    skip('Ticket resend (no booking)');
  }

  // ── 23. Booking history ─────────────────────────────────────────────────────
  section('23  Booking history');
  const history = await req('GET', '/api/v1/bookings/my', null, loginToken);
  check('Returns 200',               history.status === 200,               `got ${history.status}`);
  check('Has bookings array',        Array.isArray(history.body?.data?.bookings));
  check('Contains test booking',     (history.body?.data?.bookings?.length || 0) >= 1);
  check('Has total count',           typeof history.body?.data?.total === 'number');

  // ── 24. Agency application (public) ────────────────────────────────────────
  section('24  Agency application (public)');
  const appRes = await req('POST', '/api/v1/agencies/apply', {
    companyName: `Test Bus Co ${Date.now()}`,
    contactName: 'Jane Manager',
    contactPhone: `+2507${(Date.now() + 1).toString().slice(-8)}`,
    contactEmail: `test${Date.now()}@busco.rw`,
    fleetSize: 5,
    routesDescription: 'Kigali–Musanze, Kigali–Huye',
  });
  check('Returns 201',               appRes.status === 201,                `got ${appRes.status}: ${appRes.body?.message || ''}`);
  check('Has application record',    !!appRes.body?.data?.application || !!appRes.body?.message);

  // ── 25. Agency application — validation ────────────────────────────────────
  section('25  Agency application validation');
  const badApp = await req('POST', '/api/v1/agencies/apply', {
    companyName: 'Test',
    // missing required contactName, contactPhone, contactEmail
  });
  check('Missing fields → 400/422', [400, 422].includes(badApp.status), `got ${badApp.status}`);

  // ── 26. Forgot password ─────────────────────────────────────────────────────
  section('26  Forgot password');
  const forgot = await req('POST', '/api/v1/auth/forgot-password', { phoneNumber: phone });
  check('Returns 200',               forgot.status === 200,                `got ${forgot.status}`);
  check('No token exposed',          !forgot.body?.data?.token);

  // ── 27. Change password ─────────────────────────────────────────────────────
  section('27  Change password');
  const changePw = await req('PUT', '/api/v1/auth/change-password', {
    currentPassword: 'Test@1234', newPassword: 'NewPass@5678',
  }, loginToken);
  check('Returns 200',               changePw.status === 200,              `got ${changePw.status}`);

  // Verify new password works
  const relogin = await req('POST', '/api/v1/auth/login', { phoneNumber: phone, password: 'NewPass@5678' });
  check('New password works',        relogin.status === 200,               `got ${relogin.status}`);
  const newToken = relogin.body?.data?.accessToken || loginToken;

  // ── 28. Unauthenticated ticket access ───────────────────────────────────────
  section('28  Cross-user ticket access');
  if (bookingId) {
    // Register second user and try to access first user's ticket
    const phone2 = `+2507${(Date.now() + 2).toString().slice(-8)}`;
    const reg2 = await req('POST', '/api/v1/auth/register', {
      fullName: 'Other User', phoneNumber: phone2, password: 'Other@1234', email: `other${Date.now()}@example.com`,
    });
    const token2 = reg2.body?.data?.accessToken;
    if (token2) {
      const crossTicket = await req('GET', `/api/v1/tickets/${bookingId}`, null, token2);
      check('Other user cannot see ticket → 403 or 404',
            [403, 404].includes(crossTicket.status),                       `got ${crossTicket.status}`);
    } else {
      skip('Cross-user check (second registration failed)');
    }
  } else {
    skip('Cross-user ticket access (no booking)');
  }

  // ── 29. Rate limit headers ──────────────────────────────────────────────────
  section('29  Rate limit headers');
  const rlCheck = await req('GET', '/api/v1/stations', null, loginToken);
  const hasRLHeaders = !!(
    rlCheck.headers?.['ratelimit-limit'] ||
    rlCheck.headers?.['x-ratelimit-limit'] ||
    rlCheck.headers?.['ratelimit-remaining']
  );
  check('Rate-limit headers present', hasRLHeaders,
        `headers: ${JSON.stringify(Object.keys(rlCheck.headers).filter(h => h.includes('rate')))}`);

  // ── 30. 404 handling ────────────────────────────────────────────────────────
  section('30  404 handling');
  const notFound = await req('GET', '/api/v1/nonexistent-route', null, loginToken);
  check('Unknown route → 404',       notFound.status === 404,              `got ${notFound.status}`);
  check('Has error message',         !!notFound.body?.message);

  // ── 31. Cancellation (passenger can cancel own pending booking) ─────────────
  section('31  Booking cancellation');
  if (scheduleId && busId) {
    // Create a fresh booking to cancel (the earlier one is now confirmed)
    const allSeats2 = await req('GET', `/api/v1/buses/${busId}/seats?scheduleId=${scheduleId}`, null, newToken);
    const availSeats = (allSeats2.body?.data?.seats || []).filter(s => s.is_available !== false);
    let cancelBookingId = null;
    for (const seat of availSeats) {
      const b = await req('POST', '/api/v1/bookings', {
        scheduleId, seatId: seat.id,
        passengerName: 'Cancel Me', passengerPhone: phone, passengerEmail: `cancel${Date.now()}@example.com`,
      }, newToken);
      if (b.status === 201) { cancelBookingId = b.body?.data?.booking?.id; break; }
    }
    if (cancelBookingId) {
      const cancel = await req('DELETE', `/api/v1/bookings/${cancelBookingId}`, null, newToken);
      check('Cancel returns 200',    cancel.status === 200,                `got ${cancel.status}`);
    } else {
      skip('Cancellation (no free seat for fresh booking)');
    }
  } else {
    skip('Booking cancellation (no schedule)');
  }

  // ── 32. Schedules list ──────────────────────────────────────────────────────
  section('32  Schedules list');
  const schedsRes = await req('GET', '/api/v1/schedules', null, loginToken);
  check('Returns 200',               schedsRes.status === 200,             `got ${schedsRes.status}`);
  check('Has schedules array',       Array.isArray(schedsRes.body?.data?.schedules || schedsRes.body?.data));

  // ── 33. Buses list ──────────────────────────────────────────────────────────
  section('33  Buses list');
  const busesRes = await req('GET', '/api/v1/buses', null, loginToken);
  check('Returns 200',               busesRes.status === 200,              `got ${busesRes.status}`);
  check('Has buses array',           Array.isArray(busesRes.body?.data?.buses || busesRes.body?.data));

  // ─── Results ────────────────────────────────────────────────────────────────
  const total = passed + failed + skipped;
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  Results: ${String(passed).padEnd(3)} passed  ${String(failed).padEnd(3)} failed  ${String(skipped).padEnd(3)} skipped   ║`);
  console.log(`║  Total:   ${total} checks                          ║`);
  console.log('╚══════════════════════════════════════════════╝');

  if (failures.length > 0) {
    console.log('\n  Failed checks:');
    failures.forEach((f, i) => console.log(`    ${i + 1}. ${f}`));
  }

  if (skipped > 0) {
    console.log(`\n  Note: ${skipped} skipped checks require seeded data (stations, routes, future schedules).`);
    console.log('  Add them via the admin dashboard and re-run.\n');
  }

  process.exit(failed > 0 ? 1 : 0);
};

run().catch(err => {
  console.error('\n  Test runner crashed:', err.message);
  process.exit(1);
});
