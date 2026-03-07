const busesService = require('./buses.service');
const { success, created } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, busType, search } = req.query;
    const result = await busesService.getAllBuses({ page: parseInt(page) || 1, limit: parseInt(limit) || 20, busType, search });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const bus = await busesService.getBusById(req.params.id);
    return success(res, { bus });
  } catch (err) {
    next(err);
  }
};

const getSeats = async (req, res, next) => {
  try {
    const { scheduleId } = req.query;
    const seats = await busesService.getBusSeats(req.params.id, scheduleId);
    return success(res, { seats });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const bus = await busesService.createBus(req.body);
    return created(res, { bus }, 'Bus created');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const bus = await busesService.updateBus(req.params.id, req.body);
    return success(res, { bus }, 'Bus updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await busesService.deleteBus(req.params.id);
    return success(res, null, 'Bus deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, getSeats, create, update, remove };
