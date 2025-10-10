// routes/friends.js - ПРОВЕРЯЕМ РОУТЫ
const express = require('express');
const friendshipController = require('../controllers/friendshipController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', friendshipController.getFriends);
router.get('/requests', friendshipController.getFriendRequests);
router.post('/:targetUserId/request', friendshipController.sendFriendRequest);
router.put('/:requestId/accept', friendshipController.acceptFriendRequest);
router.put('/:requestId/reject', friendshipController.rejectFriendRequest);
router.delete('/:friendshipId', friendshipController.removeFriend);

module.exports = router;
