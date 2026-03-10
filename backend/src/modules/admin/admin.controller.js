const { getDashboard, getReports } = require('./admin.service');
const { success, error } = require('../../utils/response');

const dashboard = async (req, res) => {
  try {
    const data = await getDashboard();
    return success(res, data, 'Dashboard data retrieved');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const reports = async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await getReports({ from, to });
    return success(res, data, 'Reports retrieved');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

module.exports = { dashboard, reports };
