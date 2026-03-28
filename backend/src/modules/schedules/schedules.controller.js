const schedulesService = require('./schedules.service');
const { success, created } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, routeId, date, status } = req.query;
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    const result = await schedulesService.getAllSchedules({
      page: parseInt(page) || 1, limit: parseInt(limit) || 20, routeId, date, status, agencyId,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const schedule = await schedulesService.getScheduleById(req.params.id);
    return success(res, { schedule });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    const schedule = await schedulesService.createSchedule({ ...req.body, agencyId });
    return created(res, { schedule }, 'Schedule created');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    const schedule = await schedulesService.updateSchedule(req.params.id, req.body, agencyId);
    return success(res, { schedule }, 'Schedule updated');
  } catch (err) {
    next(err);
  }
};

const cancel = async (req, res, next) => {
  try {
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    await schedulesService.cancelSchedule(req.params.id, agencyId);
    return success(res, null, 'Schedule cancelled');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, cancel };
