const bookingsService = require('./bookings.service');
const { success, created } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const { scheduleId, seatId, passengerName, passengerPhone, passengerEmail } = req.body;
    const booking = await bookingsService.createBooking({
      userId: req.user.id,
      scheduleId,
      seatId,
      passengerName,
      passengerPhone,
      passengerEmail,
    });
    return created(res, { booking }, 'Booking created. Complete payment within 15 minutes.');
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const booking = await bookingsService.getBookingSummary(req.params.id, req.user.id);
    return success(res, { booking });
  } catch (err) {
    next(err);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const result = await bookingsService.getUserBookings(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const cancel = async (req, res, next) => {
  try {
    await bookingsService.cancelBooking(req.params.id, req.user.id);
    return success(res, null, 'Booking cancelled successfully');
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page, limit, status, scheduleId, date } = req.query;
    const result = await bookingsService.getAllBookings({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      scheduleId,
      date,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const createBatch = async (req, res, next) => {
  try {
    const { scheduleId, passengers } = req.body;
    if (!Array.isArray(passengers) || passengers.length < 1) {
      return res.status(400).json({ message: 'passengers array is required' });
    }
    const bookings = await bookingsService.createBatchBookings({ userId: req.user.id, scheduleId, passengers });
    return created(res, { bookings }, `${bookings.length} booking(s) created. Complete payment within 15 minutes.`);
  } catch (err) {
    next(err);
  }
};

module.exports = { create, createBatch, getSummary, getMyBookings, cancel, getAll };
