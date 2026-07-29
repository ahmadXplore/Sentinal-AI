const ChatSession = require('../models/ChatSession');
const { chatWithContext, chatWithContextStream } = require('../services/groqService');
const { buildChatContext } = require('../services/AIContextBuilder');
const metrics = require('../services/aiMetrics');

/**
 * @desc  Start or retrieve a chat session for an alert/log
 * @route POST /api/chat/session
 */
exports.startSession = async (req, res) => {
  const { contextType, contextId } = req.body;

  if (!contextType || !contextId) {
    return res.status(400).json({ success: false, message: 'contextType and contextId are required' });
  }

  // Check for existing session for this context by this user
  let session = await ChatSession.findOne({
    contextType,
    contextId,
    createdBy: req.user._id,
  }).sort({ createdAt: -1 });

  if (!session) {
    session = await ChatSession.create({
      contextType,
      contextId,
      createdBy: req.user._id,
      title: `Investigation Chat — ${contextType === 'alert' ? 'Alert' : 'Log'} #${contextId}`,
      messages: [],
    });
  }

  res.json({
    success: true,
    data: { session },
  });
};

/**
 * @desc  Send a message in a chat session
 * @route POST /api/chat/:sessionId/message
 */
exports.sendMessage = async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;
  const isStream = req.query.stream === 'true';

  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  const session = await ChatSession.findById(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Chat session not found' });
  }

  if (session.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to access this session' });
  }

  // Build compact context via AIContextBuilder (replaces raw log dumping)
  const contextSummary = await buildChatContext(session.contextType, session.contextId.toString());

  // Add user message
  session.messages.push({ role: 'user', content: message.trim() });
  await session.save();

  // Sliding window: last 6 messages (3 exchanges) to keep prompt small
  const recentHistory = session.messages.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (isStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();

    const startTime = Date.now();

    try {
      const stream = await chatWithContextStream(recentHistory, contextSummary);
      const { TextDecoder } = require('util');
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      for await (const chunk of stream) {
        buffer += decoder.decode(chunk, { stream: true });

        let lineIndex;
        while ((lineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, lineIndex).trim();
          buffer = buffer.slice(lineIndex + 1);

          if (!line) continue;
          if (line === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const token = data.choices?.[0]?.delta?.content;
              if (token) {
                fullResponse += token;
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }

      // Parse any leftover buffer
      if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const token = data.choices?.[0]?.delta?.content;
            if (token) {
              fullResponse += token;
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
          } catch (e) {
            // ignore
          }
        }
      }

      // Log streaming metrics
      metrics.logRequest({
        type: 'chat_stream',
        promptChars: contextSummary.length + recentHistory.reduce((s, m) => s + m.content.length, 0),
        responseChars: fullResponse.length,
        durationMs: Date.now() - startTime,
      });

      // Add AI response
      const cleanedResponse = fullResponse.replace(/^SentinelAI:\s*/i, '').trim();
      const finalSession = await ChatSession.findById(sessionId);
      if (finalSession) {
        finalSession.messages.push({ role: 'assistant', content: cleanedResponse });
        finalSession.totalMessages = finalSession.messages.length;
        await finalSession.save();
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  } else {
    const startTime = Date.now();
    let aiResponse;
    try {
      aiResponse = await chatWithContext(recentHistory, contextSummary);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `AI chat failed: ${error.message}`,
      });
    }

    const cleanedResponse = aiResponse.replace(/^SentinelAI:\s*/i, '').trim();
    const finalSession = await ChatSession.findById(sessionId);
    if (finalSession) {
      finalSession.messages.push({ role: 'assistant', content: cleanedResponse });
      finalSession.totalMessages = finalSession.messages.length;
      await finalSession.save();
    }

    res.json({
      success: true,
      data: {
        response: cleanedResponse,
        sessionId: session._id,
        processingTime: Date.now() - startTime,
      },
    });
  }
};

/**
 * @desc  Get full chat history for a session
 * @route GET /api/chat/:sessionId/history
 */
exports.getHistory = async (req, res) => {
  const session = await ChatSession.findById(req.params.sessionId).lean();

  if (!session) {
    return res.status(404).json({ success: false, message: 'Chat session not found' });
  }

  if (session.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to access this session' });
  }

  res.json({
    success: true,
    data: { session },
  });
};

/**
 * @desc  Get all sessions for a context (alert or log)
 * @route GET /api/chat/sessions/:contextType/:contextId
 */
exports.getSessions = async (req, res) => {
  const { contextType, contextId } = req.params;

  const query = { contextType, contextId };
  if (req.user.role !== 'admin') {
    query.createdBy = req.user._id;
  }

  const sessions = await ChatSession.find(query)
    .select('_id title totalMessages createdAt updatedAt createdBy model')
    .sort({ updatedAt: -1 })
    .lean();

  res.json({
    success: true,
    data: { sessions },
  });
};

/**
 * @desc  Delete a chat session
 * @route DELETE /api/chat/:sessionId
 */
exports.deleteSession = async (req, res) => {
  const session = await ChatSession.findById(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ success: false, message: 'Chat session not found' });
  }

  if (session.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this session' });
  }

  await session.deleteOne();
  res.json({ success: true, message: 'Chat session deleted' });
};
