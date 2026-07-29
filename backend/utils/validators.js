/**
 * Input validators and sanitizers.
 */

function validateEmail(email) {
  const re = /^\S+@\S+\.\S+$/;
  return re.test(email);
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true };
}

function validateRegistration(data) {
  const errors = [];

  if (!data.username || data.username.trim().length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  if (!data.email || !validateEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }
  const pwCheck = validatePassword(data.password);
  if (!pwCheck.valid) {
    errors.push(pwCheck.message);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateLogin(data) {
  const errors = [];

  if (!data.email) {
    errors.push('Email is required');
  }
  if (!data.password) {
    errors.push('Password is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateRegistration,
  validateLogin,
};
