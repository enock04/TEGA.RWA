const usersService = require('./users.service');
const { success } = require('../../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const user = await usersService.getProfile(req.user.id);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email } = req.body;
    const user = await usersService.updateProfile(req.user.id, { fullName, email });
    return success(res, { user }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, role, search } = req.query;
    const result = await usersService.getAllUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      role,
      search,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await usersService.setUserStatus(id, isActive);
    return success(res, { user }, `User ${isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { fullName, email, role } = req.body;
    const user = await usersService.updateUser(req.params.id, { fullName, email, role });
    return success(res, { user }, 'User updated successfully');
  } catch (err) { next(err); }
};

const createAgent = async (req, res, next) => {
  try {
    const { fullName, phoneNumber, email, password } = req.body;
    const user = await usersService.createAgent({ fullName, phoneNumber, email, password });
    return success(res, { user }, 'Agent created successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, getAllUsers, toggleUserStatus, createAgent, updateUser };
