const PDFDocument = require('pdfkit');

/**
 * Generate a PDF ticket buffer for a given ticket record.
 * @param {object} ticket - Full ticket row joined with booking/schedule/bus/route/stations
 * @returns {Promise<Buffer>}
 */
const generateTicketPDF = (ticket) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40, info: { Title: `Ticket ${ticket.ticket_number}` } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PRIMARY  = '#1a56db'; // brand blue
    const DARK     = '#1f2937';
    const GRAY     = '#6b7280';
    const LIGHT_BG = '#f3f4f6';

    const pageW = doc.page.width - 80; // content width within margins

    // ── Header band ──
    doc.rect(0, 0, doc.page.width, 70).fill(PRIMARY);
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
      .text('TEGA.Rw', 40, 18);
    doc.fontSize(9).font('Helvetica')
      .text('Inter-provincial Bus Ticketing System', 40, 42);
    doc.fillColor(DARK);

    // ── Ticket number ──
    doc.moveDown(3.5);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(PRIMARY)
      .text('TICKET NUMBER', { align: 'center' });
    doc.fontSize(18).font('Helvetica-Bold').fillColor(DARK)
      .text(ticket.ticket_number, { align: 'center' });

    // ── Divider ──
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(40 + pageW, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ── Helper to draw a label-value row ──
    const row = (label, value, y) => {
      doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(label.toUpperCase(), 40, y);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(value || '—', 40, y + 12, { width: pageW });
    };

    const departureFormatted = ticket.departure_time
      ? new Date(ticket.departure_time).toLocaleString('en-RW', {
          dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Kigali',
        })
      : '—';

    const arrivalFormatted = ticket.arrival_time
      ? new Date(ticket.arrival_time).toLocaleString('en-RW', {
          dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Kigali',
        })
      : '—';

    let y = doc.y;
    row('Passenger Name', ticket.passenger_name, y);          y += 38;
    row('Route',          `${ticket.departure_station} → ${ticket.arrival_station}`, y); y += 38;
    row('Departure',      departureFormatted, y);              y += 38;
    row('Arrival',        arrivalFormatted, y);                y += 38;

    // ── Two-column: seat + bus ──
    doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('SEAT', 40, y);
    doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('BUS', 40 + pageW / 2, y);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(`#${ticket.seat_number}`, 40, y + 12);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(ticket.bus_name || ticket.plate_number, 40 + pageW / 2, y + 12);
    y += 38;

    row('Amount Paid', `${parseFloat(ticket.amount || 0).toLocaleString()} RWF`, y);
    y += 38;

    // ── Status badge ──
    const statusColor = ticket.is_used ? '#ef4444' : '#10b981';
    const statusLabel = ticket.is_used ? 'USED' : 'VALID';
    doc.rect(40, y, 60, 22).fill(statusColor);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
      .text(statusLabel, 40, y + 6, { width: 60, align: 'center' });
    y += 36;

    // ── QR code (if data URL available) ──
    if (ticket.qr_code_data && ticket.qr_code_data.startsWith('data:image/png;base64,')) {
      const base64 = ticket.qr_code_data.split(',')[1];
      const imgBuf = Buffer.from(base64, 'base64');
      const qrSize = 100;
      const qrX = 40 + pageW - qrSize;
      doc.image(imgBuf, qrX, y - 36, { width: qrSize, height: qrSize });
    }

    // ── Footer ──
    doc.moveTo(40, doc.page.height - 55).lineTo(40 + pageW, doc.page.height - 55)
      .strokeColor('#d1d5db').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
      .text('This ticket is your proof of payment. Present it (digital or printed) when boarding.',
        40, doc.page.height - 48, { width: pageW, align: 'center' });
    doc.text('support@tega.rw  |  www.tega.rw',
      40, doc.page.height - 34, { width: pageW, align: 'center' });

    doc.end();
  });
};

module.exports = { generateTicketPDF };
