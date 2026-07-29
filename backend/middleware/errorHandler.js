const config = require('../config/env');

/**
 * Global error handling middleware.
 * Catches all errors and returns consistent JSON responses.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error in development
  if (config.nodeEnv === 'development') {
    console.error('❌ Error:', err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error.message = 'Resource not found';
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `A record with this ${field} already exists`;
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error.message = messages.join('. ');
    error.statusCode = 400;
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File too large. Maximum size is 50MB.';
    error.statusCode = 400;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
