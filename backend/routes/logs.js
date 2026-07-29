const express = require('express');
const router = express.Router();
const { uploadLog, getLogs, getLogById, deleteLog } = require('../controllers/logController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

// All routes require authentication
router.use(authenticate);

router.post('/upload', authorize('admin', 'analyst'), uploadLog);
router.get('/', asyncHandler(getLogs));
router.get('/:id', asyncHandler(getLogById));
router.delete('/:id', authorize('admin', 'analyst'), asyncHandler(deleteLog));

module.exports = router;
