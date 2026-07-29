const express = require('express');
const router = express.Router();
const {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
} = require('../controllers/ruleController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// Read rules (admins, analysts, viewers)
router.get('/', getRules);
router.get('/:id', getRuleById);

// Modify rules (admin and analyst only)
router.post('/', authorize('admin', 'analyst'), createRule);
router.put('/:id', authorize('admin', 'analyst'), updateRule);
router.delete('/:id', authorize('admin', 'analyst'), deleteRule);
router.patch('/:id/toggle', authorize('admin', 'analyst'), toggleRule);

module.exports = router;
