const busesService = require('./buses.service');
const { success, created } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, busType, search } = req.query;
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    const result = await busesService.getAllBuses({ page: parseInt(page) || 1, limit: parseInt(limit) || 20, busType, search, agencyId });
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
    const _enforcedAgencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    const bus = await busesService.createBus({ ...req.body, _enforcedAgencyId });
    return created(res, { bus }, 'Bus created');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    const bus = await busesService.updateBus(req.params.id, req.body, agencyId);
    return success(res, { bus }, 'Bus updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    await busesService.deleteBus(req.params.id, agencyId);
    return success(res, null, 'Bus deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, getSeats, create, update, remove };
