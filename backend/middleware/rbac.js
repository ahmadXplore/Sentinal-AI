/**
 * Role-based access control middleware.
 * Usage: authorize('admin', 'analyst')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized for this action. Required: ${roles.join(' or ')}.`,
      });
    }

    next();
  };
};

module.exports = authorize;
