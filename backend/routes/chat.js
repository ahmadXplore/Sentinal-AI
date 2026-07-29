const express = require('express');
const router = express.Router();
const {
  startSession,
  sendMessage,
  getHistory,
  getSessions,
  deleteSession,
} = require('../controllers/chatController');
const authenticate = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

router.use(authenticate);

// Session management
router.post('/session', asyncHandler(startSession));
router.get('/sessions/:contextType/:contextId', asyncHandler(getSessions));

// Messaging
router.post('/:sessionId/message', asyncHandler(sendMessage));
router.get('/:sessionId/history', asyncHandler(getHistory));
router.delete('/:sessionId', asyncHandler(deleteSession));

module.exports = router;
