const express = require('express');
const router = express.Router();
const {
  register, login, googleLogin, getProfile, getUsers,
  createUser, updateUserRole, toggleUserBlock, deleteUser,
  verifyToken, verifyOtp
} = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { authLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../utils/helpers');

// Public routes with strict rate limiting
router.post('/register', authLimiter, asyncHandler(register));
router.post('/login', authLimiter, asyncHandler(login));
router.post('/google', authLimiter, asyncHandler(googleLogin));
router.post('/verify-otp', authLimiter, asyncHandler(verifyOtp));

// Token verification (silent frontend check)
router.get('/verify', authenticate, asyncHandler(verifyToken));

// Protected routes
router.get('/profile', authenticate, asyncHandler(getProfile));

// User listing (admin and analyst only, to support alert assignment)
router.get('/users', authenticate, authorize('admin', 'analyst'), asyncHandler(getUsers));
router.post('/users', authenticate, authorize('admin'), asyncHandler(createUser));
router.put('/users/:id/role', authenticate, authorize('admin'), asyncHandler(updateUserRole));
router.patch('/users/:id/block', authenticate, authorize('admin'), asyncHandler(toggleUserBlock));
router.delete('/users/:id', authenticate, authorize('admin'), asyncHandler(deleteUser));

module.exports = router;
