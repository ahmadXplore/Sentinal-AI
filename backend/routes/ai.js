const express = require('express');
const router = express.Router();
const { summarizeLog, getSummary, getHealth, getMetrics, getExplainability } = require('../controllers/aiController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

// All routes require authentication
router.use(authenticate);

router.post('/summarize/:logId', authorize('admin', 'analyst'), asyncHandler(summarizeLog));
router.get('/summary/:logId', asyncHandler(getSummary));
router.get('/explain/:alertId', authorize('admin', 'analyst'), asyncHandler(getExplainability));
router.get('/health', asyncHandler(getHealth));
router.get('/metrics', authorize('admin', 'analyst'), asyncHandler(getMetrics));

module.exports = router;
