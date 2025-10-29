/**
 * Chat Routes
 * 
 * Text-based chat interactions with AI
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Process text chat message (PROTECTED)
// Note: The model instance needs to be passed from the main server
router.post('/api/chat', (req, res) => {
    // Model will be injected via middleware or passed from main app
    chatController.processChat(req, res, req.app.get('geminiModel'));
});

// Get conversation history (PROTECTED)
router.get('/api/conversation-history', chatController.getHistory);

// Clear conversation history (PROTECTED)
router.post('/api/clear-history', chatController.clearConversationHistory);

module.exports = router;
