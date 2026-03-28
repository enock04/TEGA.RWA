const nodemailer = require('nodemailer');
const logger = require('./logger');

// ─── Email ────────────────────────────────────────────────────────────────────

// Lazy transporter — only created when SMTP credentials are present
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();

  if (!transporter) {
    logger.warn(`[EMAIL] SMTP not configured — logging only. To: ${to} | Subject: ${subject}`);
    logger.debug(`[EMAIL] Body: ${text || html}`);
    return { messageId: `no-smtp-${Date.now()}` };
  }

  try {
    const info = await transporter.sendMail({
      from: `"TEGA.Rw" <${process.env.EMAIL_FROM || 'noreply@tega.rw'}>`,
      to,
      subject,
      html,
      text,
    });
    logger.info(`[EMAIL] Sent to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`[EMAIL] Failed to send to ${to}:`, err.message);
    throw err;
  }
};

// ─── SMS (Twilio) ─────────────────────────────────────────────────────────────

let _twilioClient = null;

const getTwilioClient = () => {
  if (_twilioClient) return _twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken || accountSid.startsWith('AC_mock')) {
    return null;
  }

  _twilioClient = require('twilio')(accountSid, authToken);
  return _twilioClient;
};

const sendSMS = async (phoneNumber, message) => {
  const client = getTwilioClient();

  if (!client) {
    logger.warn(`[SMS] Twilio not configured — logging only. To: ${phoneNumber}`);
    logger.info(`[SMS] Message: ${message}`);
    return { status: 'not_sent', sid: `no-sms-${Date.now()}` };
  }

  try {
    const result = await client.messages.create({
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: message,
    });

    logger.info(`[SMS] Sent to ${phoneNumber} — SID: ${result.sid}, status: ${result.status}`);
    return result;
  } catch (err) {
    logger.error(`[SMS] Failed to send to ${phoneNumber}:`, err.message);
    throw err;
  }
};

// ─── Templates ────────────────────────────────────────────────────────────────

const sendTicketEmail = async ({ to, passengerName, bookingId, busName, route, departureTime, seatNumber, qrCodeDataUrl }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>
      body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
      .ticket { background: white; border-radius: 12px; padding: 30px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .header { background: #1a56db; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
      .detail { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
      .label { color: #666; font-size: 14px; }
      .value { font-weight: bold; color: #111; }
      .qr { text-align: center; margin-top: 20px; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style></head>
    <body>
      <div class="ticket">
        <div class="header">
          <h1>TEGA.Rw Digital Ticket</h1>
          <p>Inter-provincial Bus Ticket Reservation System</p>
        </div>
        <p>Dear <strong>${passengerName}</strong>, your booking is confirmed!</p>
        <div class="detail"><span class="label">Booking ID</span><span class="value">${bookingId}</span></div>
        <div class="detail"><span class="label">Bus</span><span class="value">${busName}</span></div>
        <div class="detail"><span class="label">Route</span><span class="value">${route}</span></div>
        <div class="detail"><span class="label">Departure</span><span class="value">${departureTime}</span></div>
        <div class="detail"><span class="label">Seat Number</span><span class="value">${seatNumber}</span></div>
        <div class="qr">
          <p>Scan QR code at boarding:</p>
          <img src="${qrCodeDataUrl}" alt="QR Code" width="200" height="200"/>
        </div>
        <div class="footer">
          <p>TEGA.Rw &mdash; Rwanda's trusted bus ticketing platform</p>
          <p>For support: support@tega.rw | +250 700 000 000</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Your TEGA.Rw Ticket — Booking ${bookingId}`,
    html,
    text: `Your TEGA.Rw ticket is confirmed. Booking: ${bookingId}, Bus: ${busName}, Route: ${route}, Departure: ${departureTime}, Seat: ${seatNumber}`,
  });
};

const sendBookingConfirmationSMS = async (phoneNumber, { bookingId, busName, departureTime, seatNumber }) => {
  const message = `TEGA.Rw: Booking confirmed! ID: ${bookingId}, Bus: ${busName}, Departs: ${departureTime}, Seat: ${seatNumber}. Show this SMS at boarding.`;
  return sendSMS(phoneNumber, message);
};

const sendPasswordResetSMS = async (phoneNumber, resetToken) => {
  const message = `TEGA.Rw: Your password reset code is ${resetToken}. It expires in 15 minutes. If you did not request this, ignore this message.`;
  return sendSMS(phoneNumber, message);
};

module.exports = {
  sendEmail,
  sendSMS,
  sendTicketEmail,
  sendBookingConfirmationSMS,
  sendPasswordResetSMS,
};
