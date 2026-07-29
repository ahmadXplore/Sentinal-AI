const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/dashboardController');
const authenticate = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

router.get('/stats', authenticate, asyncHandler(getStats));

module.exports = router;
