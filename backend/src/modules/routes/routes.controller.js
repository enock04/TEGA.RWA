const routesService = require('./routes.service');
const { success, created, badRequest } = require('../../utils/response');

const search = async (req, res, next) => {
  try {
    const { departureStationId, destinationStationId, date } = req.query;
    if (!departureStationId || !destinationStationId || !date) {
      return badRequest(res, 'departureStationId, destinationStationId and date are required');
    }
    const results = await routesService.searchRoutes({ departureStationId, destinationStationId, date });
    return success(res, { schedules: results, count: results.length });
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await routesService.getAllRoutes({ page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const route = await routesService.getRouteById(req.params.id);
    return success(res, { route });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const route = await routesService.createRoute(req.body);
    return created(res, { route }, 'Route created');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const route = await routesService.updateRoute(req.params.id, req.body);
    return success(res, { route }, 'Route updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await routesService.deleteRoute(req.params.id);
    return success(res, null, 'Route deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { search, getAll, getById, create, update, remove };
