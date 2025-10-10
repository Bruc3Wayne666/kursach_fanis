// routes/messages.js
const express = require('express');
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/send', messageController.sendMessage);
router.get('/chats', messageController.getChats);
router.get('/chat/:otherUserId', messageController.getChatHistory);
router.get('/conversation/:conversationId', messageController.getConversationMessages);
router.put('/read', messageController.markAsRead);
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
