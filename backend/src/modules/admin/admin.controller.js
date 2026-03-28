const { getDashboard, getReports, getAgencies, getAgencyById, createAgency, updateAgency, toggleAgencyStatus, exportBookingsCSV, toCSV } = require('./admin.service');
const { success, error } = require('../../utils/response');

const dashboard = async (req, res) => {
  try {
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    const data = await getDashboard({ agencyId });
    return success(res, data, 'Dashboard data retrieved');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const reports = async (req, res) => {
  try {
    const { from, to } = req.query;
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    const data = await getReports({ from, to, agencyId });
    return success(res, data, 'Reports retrieved');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const listAgencies = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const data = await getAgencies({ page, limit, search });
    return success(res, data, 'Agencies retrieved');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const addAgency = async (req, res) => {
  try {
    const { name, registrationNo, contactPhone, contactEmail, address, logoUrl } = req.body;
    const agency = await createAgency({ name, registrationNo, contactPhone, contactEmail, address, logoUrl });
    return success(res, { agency }, 'Agency created', 201);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const getAgency = async (req, res) => {
  try {
    const agency = await getAgencyById(req.params.id);
    return success(res, { agency }, 'Agency retrieved');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const editAgency = async (req, res) => {
  try {
    const { name, registrationNo, contactPhone, contactEmail, address, logoUrl } = req.body;
    const agency = await updateAgency(req.params.id, { name, registrationNo, contactPhone, contactEmail, address, logoUrl });
    return success(res, { agency }, 'Agency updated');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const setAgencyStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return error(res, 'isActive must be a boolean', 400);
    const agency = await toggleAgencyStatus(req.params.id, isActive);
    return success(res, { agency }, `Agency ${isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const exportCSV = async (req, res) => {
  try {
    const { from, to } = req.query;
    const agencyId = req.user?.role === 'agency' ? req.user.agency_id : null;
    const rows = await exportBookingsCSV({ from, to, agencyId });
    const csv = toCSV(rows);
    const filename = `bookings-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send('\uFEFF' + csv); // BOM so Excel opens with correct encoding
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

module.exports = { dashboard, reports, listAgencies, addAgency, getAgency, editAgency, setAgencyStatus, exportCSV };
