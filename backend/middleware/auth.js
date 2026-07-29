const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header, verifies it,
 * and attaches the user object to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Find user and attach to request
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User associated with this token no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account has been deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired.',
      });
    }
    next(error);
  }
};

module.exports = authenticate;
