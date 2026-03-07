const stationsService = require('./stations.service');
const { success, created } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const { search, province } = req.query;
    const stations = await stationsService.getAllStations({ search, province });
    return success(res, { stations });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const station = await stationsService.getStationById(req.params.id);
    return success(res, { station });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const station = await stationsService.createStation(req.body);
    return created(res, { station }, 'Station created');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const station = await stationsService.updateStation(req.params.id, req.body);
    return success(res, { station }, 'Station updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await stationsService.deleteStation(req.params.id);
    return success(res, null, 'Station deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
