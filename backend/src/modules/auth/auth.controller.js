const authService = require('./auth.service');
const { success, created, error } = require('../../utils/response');
const { sendPasswordResetSMS } = require('../../utils/notifications');

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

const forgotPassword = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const token = await authService.forgotPassword(phoneNumber);
    if (token) {
      // In dev, log the token to server console only — never expose it in the response
      if (process.env.NODE_ENV !== 'production') {
        require('../../utils/logger').info(`[DEV] Password reset token for ${phoneNumber}: ${token}`);
      }
      // Send SMS (no-op/log-only if Africa's Talking is not configured)
      await sendPasswordResetSMS(phoneNumber, token).catch(() => {}); // non-fatal
    }
    // Always return the same response regardless of whether the number exists (prevents enumeration)
    return success(res, {}, 'If this number is registered, a reset code has been sent');
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    return success(res, null, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, changePassword, getProfile, forgotPassword, resetPassword };
