const express = require('express');
const router = express.Router();
const {
  getHealth,
  analyzeAnomaly,
  classifyThreat,
} = require('../controllers/mlController');
const authenticate = require('../middleware/auth');

router.get('/health',       authenticate, getHealth);
router.post('/analyze',     authenticate, analyzeAnomaly);
router.post('/classify',    authenticate, classifyThreat);

module.exports = router;
