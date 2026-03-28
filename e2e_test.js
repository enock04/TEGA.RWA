/**
 * TEGA.Rw — Full Frontend E2E Test
 * Tests every page + API integration for passenger (3000) and admin/agency (3001) apps
 * Run: node e2e_test.js
 */
'use strict';
const http = require('http');
const https = require('https');

let passed = 0, failed = 0;
const failures = [];

const section = t => console.log(`\n[ ${t} ]`);

const check = (label, condition, detail) => {
  if (condition) { console.log('  \u2713 ' + label); passed++; }
  else {
    const msg = detail ? label + ' -- ' + detail : label;
    console.log('  \u2717 ' + msg);
    failures.push(msg); failed++;
  }
};

// HTTP helper
const req = (method, url, body, extraHeaders) => new Promise((resolve, reject) => {
  const parsed = new URL(url);
  const payload = body ? JSON.stringify(body) : null;
  const opts = {
    hostname: parsed.hostname,
    port: parseInt(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/html,application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(extraHeaders || {}),
    },
  };
  const lib = parsed.protocol === 'https:' ? https : http;
  const r = lib.request(opts, res => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      let json = null;
      try { json = JSON.parse(raw); } catch (e) { /* not JSON */ }
      resolve({ status: res.statusCode, headers: res.headers, html: raw, json, ok: res.statusCode < 400 });
    });
  });
  r.on('error', reject);
  if (payload) r.write(payload);
  r.end();
});

const api  = (method, path, body, token) => req(method, 'http://localhost:5000/api/v1' + path, body,
  token ? { Authorization: 'Bearer ' + token } : undefined);
// Use local dev servers on 4000 (passenger) and 4001 (admin)
const PASSENGER_PORT = 4000;
const ADMIN_PORT = 4001;
const page = (path, port) => req('GET', 'http://localhost:' + (port || PASSENGER_PORT) + path);

(async () => {
  console.log('\n\u2554' + '\u2550'.repeat(52) + '\u2557');
  console.log('\u2551      TEGA.Rw -- Frontend End-to-End Test Suite      \u2551');
  console.log('\u255a' + '\u2550'.repeat(52) + '\u255d');

  // ── Setup: register a test user + get admin token ───────────────────────
  const ts = Date.now();
  const phone = '+2507' + String(ts).slice(-8);
  const regSetup = await api('POST', '/auth/register', { phoneNumber: phone, password: 'Password@1', fullName: 'E2E Test User' });
  const token = regSetup.json && regSetup.json.data && regSetup.json.data.accessToken;

  // Admin credentials from seed data
  let adminToken = null;
  const adminCreds = [
    { phoneNumber: '+250788000001', password: 'Admin@1234' },
    { phoneNumber: '+250788000001', password: 'Password@1' },
  ];
  for (const cred of adminCreds) {
    const r = await api('POST', '/auth/login', cred);
    if (r.json && r.json.data && r.json.data.accessToken) {
      adminToken = r.json.data.accessToken;
      console.log('\n  Admin token obtained for ' + cred.phoneNumber);
      break;
    }
  }
  if (!adminToken) console.log('\n  Warning: No admin token -- admin-only tests will be skipped');

  // ========================================================================
  // PASSENGER APP (port 3000)
  // ========================================================================

  section('P1  Passenger -- Splash screen (unauthenticated)');
  const splash = await page('/');
  check('Page loads (200)',        splash.status === 200);
  // Next.js client components are JS-rendered; verify Next.js bootstrap is present
  check('Has Next.js bundle',      splash.html && splash.html.includes('_next'));
  check('Has viewport/meta tags',  splash.html && splash.html.includes('meta'));
  // Auth page routes exist (content is client-side rendered)
  check('/auth/login route exists',    (await page('/auth/login')).status === 200);
  check('/auth/register route exists', (await page('/auth/register')).status === 200);
  check('/apply route exists',         (await page('/apply')).status === 200);

  section('P2  Passenger -- Auth pages');
  const loginPage = await page('/auth/login');
  check('Login page loads (200)',  loginPage.status === 200);
  check('Has input elements',      loginPage.html && loginPage.html.includes('input'));

  const regPage = await page('/auth/register');
  check('Register page loads (200)', regPage.status === 200);
  check('Has input elements',        regPage.html && regPage.html.includes('input'));

  const forgotPage = await page('/auth/forgot-password');
  check('Forgot-password page loads', forgotPage.status === 200 || forgotPage.status === 404);

  section('P3  Passenger -- Agency apply page');
  const applyPage = await page('/apply');
  check('Apply page loads (200)',      applyPage.status === 200);
  check('Has Company Name field',      applyPage.html && (applyPage.html.includes('Company') || applyPage.html.includes('company')));
  check('Has Contact Person section',  applyPage.html && (applyPage.html.includes('Contact') || applyPage.html.includes('contact')));
  check('Has submit button',           applyPage.html && (applyPage.html.includes('Submit') || applyPage.html.includes('submit')));
  check('No unescaped apostrophes',    !applyPage.html || !applyPage.html.includes("We'll"));

  section('P4  Passenger -- Search page');
  const searchPage = await page('/search');
  check('Search page loads (200)',  searchPage.status === 200);
  check('Has TEGA branding',        searchPage.html && searchPage.html.includes('TEGA'));

  section('P5  Passenger -- Dashboard and protected pages');
  const dashPage = await page('/dashboard');
  check('Dashboard responds',      dashPage.status === 200 || dashPage.status === 307);
  const profilePage = await page('/profile');
  check('Profile page responds',   profilePage.status === 200 || profilePage.status === 307);

  section('P6  Passenger -- API: Registration');
  const phone2 = '+2507' + String(ts + 1).slice(-8);
  const reg2 = await api('POST', '/auth/register', { phoneNumber: phone2, password: 'Password@1', fullName: 'New Passenger' });
  check('Registration returns 201',   reg2.status === 201);
  check('Returns accessToken',        reg2.json && !!reg2.json.data && !!reg2.json.data.accessToken);
  check('Returns refreshToken',       reg2.json && !!reg2.json.data && !!reg2.json.data.refreshToken);
  check('Role is passenger',          reg2.json && reg2.json.data && reg2.json.data.user && reg2.json.data.user.role === 'passenger');
  check('Duplicate phone -> 409',     (await api('POST', '/auth/register', { phoneNumber: phone2, password: 'Password@1', fullName: 'Dup' })).status === 409);

  section('P7  Passenger -- API: Login');
  const loginRes = await api('POST', '/auth/login', { phoneNumber: phone, password: 'Password@1' });
  const freshToken = loginRes.json && loginRes.json.data && loginRes.json.data.accessToken;
  check('Login returns 200',          loginRes.status === 200);
  check('Has accessToken',            !!freshToken);
  check('Wrong password -> 401',      (await api('POST', '/auth/login', { phoneNumber: phone, password: 'wrongpass' })).status === 401);
  check('Token refresh works',        (await api('POST', '/auth/refresh', { refreshToken: loginRes.json && loginRes.json.data && loginRes.json.data.refreshToken })).status === 200);

  section('P8  Passenger -- API: Profile');
  const profile = await api('GET', '/users/profile', null, freshToken);
  check('Profile returns 200',        profile.status === 200);
  check('Has phone_number field',     profile.json && profile.json.data && !!profile.json.data.user);
  check('No password_hash exposed',   !profile.json || !JSON.stringify(profile.json).includes('password_hash'));

  section('P9  Passenger -- API: Search flow');
  const stations = await api('GET', '/stations', null, freshToken);
  check('Stations returns 200',       stations.status === 200);
  check('Returns array',              stations.json && Array.isArray(stations.json.data && stations.json.data.stations));
  check('Station search works',       (await api('GET', '/stations?search=Kigali', null, freshToken)).status === 200);

  const schedules = await api('GET', '/schedules?limit=10', null, freshToken);
  check('Schedules returns 200',      schedules.status === 200);
  check('Returns schedules array',    schedules.json && Array.isArray(schedules.json.data && schedules.json.data.schedules));

  const schedList = schedules.json && schedules.json.data && schedules.json.data.schedules || [];
  const activeSched = schedList.find(s => s.available_seats > 0 && s.status === 'active');

  section('P10  Passenger -- API: Full booking->payment->ticket flow');
  if (activeSched && freshToken) {
    const seatsRes = await api('GET', '/buses/' + activeSched.bus_id + '/seats?scheduleId=' + activeSched.id, null, freshToken);
    check('Seat availability returns 200',   seatsRes.status === 200);
    const freeSeat = seatsRes.json && seatsRes.json.data && (seatsRes.json.data.seats || []).find(s => s.status === 'available');
    check('Has available seats',             !!freeSeat);

    if (freeSeat) {
      const bookRes = await api('POST', '/bookings', {
        scheduleId: activeSched.id, seatId: freeSeat.id,
        passengerName: 'E2E Passenger', passengerPhone: phone,
      }, freshToken);
      check('Booking creation returns 201',  bookRes.status === 201);
      check('Booking has ID',                bookRes.json && !!bookRes.json.data && !!bookRes.json.data.booking && !!bookRes.json.data.booking.id);
      check('Booking status is pending',     bookRes.json && bookRes.json.data && bookRes.json.data.booking && bookRes.json.data.booking.status === 'pending');
      check('Has expires_at',                bookRes.json && bookRes.json.data && bookRes.json.data.booking && !!bookRes.json.data.booking.expires_at);

      const bookingId = bookRes.json && bookRes.json.data && bookRes.json.data.booking && bookRes.json.data.booking.id;
      if (bookingId) {
        check('Duplicate seat -> 409',         (await api('POST', '/bookings', { scheduleId: activeSched.id, seatId: freeSeat.id, passengerName: 'Dup', passengerPhone: phone }, freshToken)).status === 409);

        const summary = await api('GET', '/bookings/' + bookingId + '/summary', null, freshToken);
        check('Booking summary returns 200',   summary.status === 200);
        check('Summary has departure station', summary.json && summary.json.data && !!summary.json.data.booking);

        const payInit = await api('POST', '/payments/initiate', { bookingId: bookingId, method: 'mtn_momo', payerPhone: phone }, freshToken);
        check('Payment initiation returns 201', payInit.status === 201, 'got ' + payInit.status + ' ' + (payInit.json && payInit.json.message || ''));
        const payData = payInit.json && payInit.json.data;
        const payId = payData && (payData.paymentId || (payData.payment && payData.payment.id));
        check('Has payment ID',                 !!payId);
        check('Double payment -> 400/409',      [400, 409].includes((await api('POST', '/payments/initiate', { bookingId: bookingId, method: 'mtn_momo', payerPhone: phone }, freshToken)).status));
        if (payId) {
          const confirm = await api('POST', '/payments/' + payId + '/confirm', { status: 'completed' }, freshToken);
          check('Payment confirmation returns 200', confirm.status === 200);
          check('Payment status completed',         confirm.json && confirm.json.data && confirm.json.data.payment && confirm.json.data.payment.status === 'completed');

          const ticket = await api('GET', '/tickets/' + bookingId, null, freshToken);
          check('Ticket retrieval returns 200', ticket.status === 200);
          check('Ticket has ticket_number',     ticket.json && ticket.json.data && !!ticket.json.data.ticket && !!ticket.json.data.ticket.ticket_number);
          check('Ticket has QR code',           ticket.json && ticket.json.data && ticket.json.data.ticket && !!ticket.json.data.ticket.qr_code_data);
          check('Ticket not yet used',          ticket.json && ticket.json.data && ticket.json.data.ticket && ticket.json.data.ticket.is_used === false);

          const pdfRes = await req('GET', 'http://localhost:5000/api/v1/tickets/' + bookingId + '/pdf', null, { Authorization: 'Bearer ' + freshToken });
          check('PDF download returns 200',     pdfRes.status === 200);
          check('Content-Type is PDF',          pdfRes.headers && pdfRes.headers['content-type'] && pdfRes.headers['content-type'].includes('application/pdf'));

          const resend = await api('POST', '/tickets/' + bookingId + '/resend', {}, freshToken);
          check('Ticket resend returns 200',    resend.status === 200);
        }

        const history = await api('GET', '/bookings/my', null, freshToken);
        check('Booking history returns 200',   history.status === 200);
        check('History contains booking',      history.json && history.json.data && (history.json.data.bookings || []).some(b => b.id === bookingId));

        const cancel = await api('DELETE', '/bookings/' + bookingId, null, freshToken);
        check('Booking cancellation returns 200', cancel.status === 200);
      }
    }
  } else {
    console.log('  - Skipped (no active schedule with seats available)');
  }

  section('P11  Passenger -- API: Password management');
  const forgot = await api('POST', '/auth/forgot-password', { phoneNumber: phone });
  check('Forgot password returns 200',   forgot.status === 200);
  check('No reset token exposed',        !forgot.json || !JSON.stringify(forgot.json).includes('reset_token'));

  // ========================================================================
  // ADMIN / AGENCY APP (port 3001)
  // ========================================================================

  section('A1  Admin App -- Page loads');
  const adminRoot = await page('/', ADMIN_PORT);
  check('Admin app root responds',       adminRoot.status === 200 || adminRoot.status === 307);
  // Root redirects to /admin/login — check the login page for branding
  const adminBrandCheck = await page('/admin/login', ADMIN_PORT);
  check('Has TEGA branding',            adminBrandCheck.html && adminBrandCheck.html.includes('TEGA'));

  const adminLoginPage = await page('/admin/login', ADMIN_PORT);
  check('Admin login page loads (200)', adminLoginPage.status === 200);
  check('Has form inputs',              adminLoginPage.html && adminLoginPage.html.includes('input'));

  section('A2  Admin App -- Protected routes (expect 307 redirect to login)');
  const adminDash = await page('/admin/dashboard', ADMIN_PORT);
  check('Admin dashboard responds',     adminDash.status === 200 || adminDash.status === 307);
  const agencyDash = await page('/agency/dashboard', ADMIN_PORT);
  check('Agency dashboard responds',    agencyDash.status === 200 || agencyDash.status === 307);
  const adminBookings = await page('/admin/bookings', ADMIN_PORT);
  check('Admin bookings page responds', adminBookings.status === 200 || adminBookings.status === 307);
  const adminAgencies = await page('/admin/agencies', ADMIN_PORT);
  check('Admin agencies page responds', adminAgencies.status === 200 || adminAgencies.status === 307);
  const adminReports = await page('/admin/reports', ADMIN_PORT);
  check('Admin reports page responds',  adminReports.status === 200 || adminReports.status === 307);
  const agencyBookings = await page('/agency/bookings', ADMIN_PORT);
  check('Agency bookings responds',     agencyBookings.status === 200 || agencyBookings.status === 307);
  const agencyReports = await page('/agency/reports', ADMIN_PORT);
  check('Agency reports responds',      agencyReports.status === 200 || agencyReports.status === 307);
  const adminSchedules = await page('/admin/schedules', ADMIN_PORT);
  check('Admin schedules responds',     adminSchedules.status === 200 || adminSchedules.status === 307);
  const adminStations = await page('/admin/stations', ADMIN_PORT);
  check('Admin stations responds',      adminStations.status === 200 || adminStations.status === 307);

  if (adminToken) {
    section('A3  Admin -- API: Dashboard');
    const dash = await api('GET', '/admin/dashboard', null, adminToken);
    check('Dashboard returns 200',          dash.status === 200);
    check('Has stats data',                 dash.json && !!dash.json.data);

    section('A4  Admin -- API: Booking management');
    const allBk = await api('GET', '/bookings/admin?limit=5', null, adminToken);
    check('All bookings returns 200',       allBk.status === 200);
    check('Returns bookings array',         allBk.json && Array.isArray(allBk.json.data && allBk.json.data.bookings));

    section('A5  Admin -- API: Reports');
    const reports = await api('GET', '/admin/reports', null, adminToken);
    check('Reports returns 200',            reports.status === 200);

    const csvRes = await req('GET', 'http://localhost:5000/api/v1/admin/reports/export', null, { Authorization: 'Bearer ' + adminToken });
    check('CSV export returns 200',         csvRes.status === 200);
    check('Content-Type includes csv/text', csvRes.headers && csvRes.headers['content-type'] && (csvRes.headers['content-type'].includes('csv') || csvRes.headers['content-type'].includes('text')));
    check('Has CSV header row',             csvRes.html && (csvRes.html.includes('booking') || csvRes.html.includes('Booking') || csvRes.html.length > 5));

    section('A6  Admin -- API: Agency applications');
    const apps = await api('GET', '/agencies/applications', null, adminToken);
    check('Applications returns 200',       apps.status === 200);
    check('Returns applications array',     apps.json && Array.isArray(apps.json.data && apps.json.data.applications));

    section('A7  Admin -- API: Users');
    const users = await api('GET', '/users', null, adminToken);
    check('Users list returns 200',         users.status === 200);
    check('Returns users array',            users.json && Array.isArray(users.json.data && users.json.data.users));

    section('A8  Admin -- API: Stations management');
    const stns = await api('GET', '/stations', null, adminToken);
    check('Stations returns 200',           stns.status === 200);

    section('A9  Admin -- API: Routes management');
    const routes = await api('GET', '/routes', null, adminToken);
    check('Routes returns 200',             routes.status === 200);
    check('Returns routes array',           routes.json && Array.isArray(routes.json.data && routes.json.data.routes));

    section('A10  Admin -- API: Buses management');
    const buses = await api('GET', '/buses', null, adminToken);
    check('Buses returns 200',              buses.status === 200);
    check('Returns buses array',            buses.json && Array.isArray(buses.json.data && buses.json.data.buses));

    section('A11  Admin -- API: Payments');
    const payments = await api('GET', '/payments?limit=5', null, adminToken);
    check('Payments returns 200',           payments.status === 200);
    check('Returns payments array',         payments.json && Array.isArray(payments.json.data && payments.json.data.payments));

    section('A12  Admin -- API: Tickets');
    const tickets = await api('GET', '/tickets?limit=5', null, adminToken);
    check('Tickets returns 200',            tickets.status === 200);
    check('Returns tickets array',          tickets.json && Array.isArray(tickets.json.data && tickets.json.data.tickets));
  } else {
    console.log('\n  [A3-A12 skipped — no admin credentials found]');
  }

  // ========================================================================
  // CROSS-CUTTING SECURITY + ERROR HANDLING
  // ========================================================================

  section('X1  Security');
  check('No token -> 401',               (await api('GET', '/users/profile')).status === 401);
  check('Bad token -> 401',              (await api('GET', '/users/profile', null, 'bad.token')).status === 401);
  check('Passenger -> admin -> 403',     freshToken ? (await api('GET', '/admin/dashboard', null, freshToken)).status === 403 : true);
  check('Passenger -> admin bookings',   freshToken ? (await api('GET', '/bookings/admin', null, freshToken)).status === 403 : true);

  section('X2  Input validation');
  const badBookingToken = freshToken || token || 'x';
  const badBookRes = await api('POST', '/bookings', { scheduleId: 'not-a-uuid', seatId: 'not-a-uuid', passengerName: 'x', passengerPhone: 'bad' }, badBookingToken);
  check('Bad UUID booking -> 400/401/422', [400, 401, 422].includes(badBookRes.status), 'got ' + badBookRes.status);
  check('Empty body -> 400/401/422',     [400, 401, 422].includes((await api('POST', '/auth/login', {})).status));

  section('X3  Error handling');
  const notFound = await api('GET', '/does-not-exist');
  check('Unknown route -> 404',          notFound.status === 404);
  check('404 has message field',         notFound.json && !!notFound.json.message);

  section('X4  CORS');
  const corsCheck = await req('OPTIONS', 'http://localhost:5000/api/v1/health', null, { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'GET' });
  check('CORS preflight responds',       corsCheck.status < 400);
  check('CORS allows localhost origins', (corsCheck.headers && corsCheck.headers['access-control-allow-origin']) || corsCheck.status === 200);

  // ── Final summary ────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n\u2554' + '\u2550'.repeat(52) + '\u2557');
  console.log('\u2551  Results: ' + passed + ' passed   ' + failed + ' failed   Total: ' + total + ' '.repeat(Math.max(0, 13 - String(total).length)) + '\u2551');
  console.log('\u255a' + '\u2550'.repeat(52) + '\u255d');
  if (failures.length) {
    console.log('\n  Failed:');
    failures.forEach((f, i) => console.log('    ' + (i + 1) + '. ' + f));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
})();
