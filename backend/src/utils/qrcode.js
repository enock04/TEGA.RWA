const QRCode = require('qrcode');

const generateQRCode = async (data) => {
  try {
    const dataUrl = await QRCode.toDataURL(JSON.stringify(data), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (err) {
    throw new Error(`QR code generation failed: ${err.message}`);
  }
};

const generateTicketQRData = (booking) => ({
  bookingId: booking.id,
  passengerName: booking.passenger_name,
  busPlate: booking.bus_plate,
  routeName: booking.route_name,
  departureTime: booking.departure_time,
  seatNumber: booking.seat_number,
  validatedAt: null,
  issuedAt: new Date().toISOString(),
});

module.exports = { generateQRCode, generateTicketQRData };
