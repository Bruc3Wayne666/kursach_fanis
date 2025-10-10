// routes/conversations.js
const express = require('express');
const conversationController = require('../controllers/conversationController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/', conversationController.createConversation);
router.get('/', conversationController.getConversations);
router.get('/:conversationId', conversationController.getConversation);
router.post('/:conversationId/members', conversationController.addMembers);
// ДОБАВЬ эту строку в routes/conversations.js:
router.put('/:conversationId', conversationController.updateConversation);

module.exports = router;
