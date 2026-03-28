const ticketsService = require('./tickets.service');
const { generateTicketPDF } = require('../../utils/pdfTicket');
const { success } = require('../../utils/response');

const downloadPDF = async (req, res, next) => {
  try {
    const ticket = await ticketsService.getTicketByBooking(req.params.bookingId);
    const pdfBuffer = await generateTicketPDF(ticket);
    const filename = `ticket-${ticket.ticket_number}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

const resend = async (req, res, next) => {
  try {
    const isAdminOrAgency = ['admin', 'agency'].includes(req.user?.role);
    const userId = isAdminOrAgency ? null : req.user.id;
    const result = await ticketsService.resendTicket(req.params.bookingId, userId);
    return success(res, result, 'Ticket resent via SMS and email');
  } catch (err) {
    next(err);
  }
};

const getByBooking = async (req, res, next) => {
  try {
    const ticket = await ticketsService.getTicketByBooking(req.params.bookingId);
    return success(res, { ticket });
  } catch (err) {
    next(err);
  }
};

const getByNumber = async (req, res, next) => {
  try {
    const ticket = await ticketsService.getTicketByNumber(req.params.ticketNumber);
    return success(res, { ticket });
  } catch (err) {
    next(err);
  }
};

const validate = async (req, res, next) => {
  try {
    const result = await ticketsService.validateTicket(req.params.ticketNumber);
    return success(res, result, result.reason);
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page, limit, date } = req.query;
    const result = await ticketsService.getAllTickets({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      date,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getByBooking, getByNumber, validate, getAll, resend, downloadPDF };
