// routes/conversations.js - ДОБАВЛЯЕМ ENDPOINT
const express = require('express');
const conversationController = require('../controllers/conversationController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);


router.get('/test', (req, res) => {
    console.log('✅ Conversations test endpoint called');
    res.json({ message: 'Conversations routes are working!', timestamp: new Date() });
});

router.post('/', conversationController.createConversation);
router.get('/', conversationController.getConversations);
router.get('/:conversationId', conversationController.getConversation);
router.post('/:conversationId/members', conversationController.addMembers);
router.put('/:conversationId', conversationController.updateConversation);
// 🔥 ДОБАВЛЯЕМ ENDPOINT ДЛЯ ВЫХОДА ИЗ БЕСЕДЫ
router.delete('/:conversationId/leave', conversationController.leaveConversation);

module.exports = router;
