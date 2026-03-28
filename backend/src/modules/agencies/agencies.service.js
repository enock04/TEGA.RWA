const { query } = require('../../config/database');
const { sendSMS } = require('../../utils/notifications');
const logger = require('../../utils/logger');

// ─── Submit an application ────────────────────────────────────────────────────

const submitApplication = async ({ companyName, registrationNo, contactName, contactPhone, contactEmail, address, fleetSize, routesDescription }) => {
  // Prevent duplicate pending applications from same email
  const dupe = await query(
    `SELECT id FROM agency_applications WHERE contact_email = $1 AND status = 'pending'`,
    [contactEmail]
  );
  if (dupe.rows.length) {
    const err = new Error('An application with this email is already pending review');
    err.statusCode = 409;
    throw err;
  }

  const result = await query(
    `INSERT INTO agency_applications
       (company_name, registration_no, contact_name, contact_phone, contact_email,
        address, fleet_size, routes_description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [companyName, registrationNo || null, contactName, contactPhone, contactEmail,
     address || null, fleetSize || null, routesDescription || null]
  );
  return result.rows[0];
};

// ─── Admin: list applications ─────────────────────────────────────────────────

const listApplications = async ({ page = 1, limit = 20, status } = {}) => {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (status) { params.push(status); where += ` AND status = $${params.length}`; }

  params.push(limit, offset);
  const result = await query(
    `SELECT * FROM agency_applications ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const count = await query(`SELECT COUNT(*) FROM agency_applications ${where}`, params.slice(0, -2));
  return { applications: result.rows, total: parseInt(count.rows[0].count), page, limit };
};

// ─── Admin: approve application ───────────────────────────────────────────────

const approveApplication = async (applicationId, reviewerId) => {
  const appResult = await query(
    `SELECT * FROM agency_applications WHERE id = $1 AND status = 'pending'`,
    [applicationId]
  );
  if (!appResult.rows.length) {
    const err = new Error('Application not found or already reviewed');
    err.statusCode = 404;
    throw err;
  }
  const app = appResult.rows[0];

  // Create the agency
  const agencyResult = await query(
    `INSERT INTO agencies (name, registration_no, contact_phone, contact_email, address)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [app.company_name, app.registration_no, app.contact_phone, app.contact_email, app.address]
  );
  const agency = agencyResult.rows[0];

  // Create agency owner account with temp password
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '!2';
  const hash = await bcrypt.hash(tempPassword, 12);

  await query(
    `INSERT INTO users (id, full_name, phone_number, email, password_hash, role, agency_id)
     VALUES ($1,$2,$3,$4,$5,'agency',$6)
     ON CONFLICT (phone_number) DO UPDATE SET agency_id = $6, role = 'agency'`,
    [uuidv4(), app.contact_name, app.contact_phone, app.contact_email, hash, agency.id]
  );

  // Update application status
  await query(
    `UPDATE agency_applications
     SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [applicationId, reviewerId]
  );

  // Notify via SMS
  sendSMS(
    app.contact_phone,
    `Congratulations ${app.contact_name}! Your TEGA.Rw agency application for ${app.company_name} has been approved. Login: ${app.contact_phone} / Temp password: ${tempPassword}. Change it on first login.`
  ).catch(err => logger.error('Agency approval SMS failed:', err));

  return { agency, tempPassword };
};

// ─── Admin: reject application ────────────────────────────────────────────────

const rejectApplication = async (applicationId, reviewerId, reason) => {
  const result = await query(
    `UPDATE agency_applications
     SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(),
         review_notes = $3, updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [applicationId, reviewerId, reason || null]
  );
  if (!result.rows.length) {
    const err = new Error('Application not found or already reviewed');
    err.statusCode = 404;
    throw err;
  }
  const app = result.rows[0];

  // Notify via SMS
  sendSMS(
    app.contact_phone,
    `TEGA.Rw: Your agency application for ${app.company_name} was not approved at this time.${reason ? ' Reason: ' + reason : ''} Contact support@tega.rw for assistance.`
  ).catch(err => logger.error('Agency rejection SMS failed:', err));

  return app;
};

module.exports = { submitApplication, listApplications, approveApplication, rejectApplication };
