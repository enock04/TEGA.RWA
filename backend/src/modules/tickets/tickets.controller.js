const ticketsService = require('./tickets.service');
const { success } = require('../../utils/response');

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

module.exports = { getByBooking, getByNumber, validate, getAll };
