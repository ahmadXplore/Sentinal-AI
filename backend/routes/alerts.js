const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getAlertById,
  updateAlertStatus,
  assignAlert,
  addAlertNote,
  getCorrelatedAlerts,
} = require('../controllers/alertController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// Read alerts (all roles)
router.get('/', getAlerts);
router.get('/:id', getAlertById);
router.get('/:id/correlations', getCorrelatedAlerts);

// Update/Modify alerts (admin and analyst only)
router.put('/:id/status', authorize('admin', 'analyst'), updateAlertStatus);
router.put('/:id/assign', authorize('admin'), assignAlert);
router.post('/:id/notes', authorize('admin', 'analyst'), addAlertNote);

module.exports = router;
