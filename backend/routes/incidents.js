const express = require('express');
const router = express.Router();
const {
  generateReport,
  getReport,
  updateReport,
  listReports,
  explainMitre,
  deleteReport,
  assignIncident,
} = require('../controllers/incidentController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

router.use(authenticate);

// MITRE explanation (no alert required)
router.get('/mitre/:techniqueId', asyncHandler(explainMitre));

// Incident report CRUD
router.get('/', asyncHandler(listReports));
router.post('/generate/:alertId', authorize('admin', 'analyst'), asyncHandler(generateReport));
router.get('/:alertId', asyncHandler(getReport));
router.put('/:id/edit', authorize('admin', 'analyst'), asyncHandler(updateReport));
router.put('/:id/assign', authorize('admin'), asyncHandler(assignIncident));
router.delete('/:id', authorize('admin'), asyncHandler(deleteReport));

module.exports = router;
