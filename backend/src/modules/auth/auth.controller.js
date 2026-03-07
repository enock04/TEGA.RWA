const authService = require('./auth.service');
const { success, created, error } = require('../../utils/response');

const register = async (req, res, next) => {
  try {
    const { fullName, phoneNumber, email, password } = req.body;
    const result = await authService.register({ fullName, phoneNumber, email, password });
    return created(res, result, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;
    const result = await authService.login({ phoneNumber, password });
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);
    return success(res, tokens, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, { currentPassword, newPassword });
    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res) => {
  const { password_hash, ...user } = req.user;
  return success(res, { user }, 'Profile retrieved');
};

module.exports = { register, login, refreshToken, changePassword, getProfile };
