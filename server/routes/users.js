const express = require('express');
const  userController  = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.get('/search', authMiddleware, userController.searchUsers);
router.get('/:userId/profile', authMiddleware, userController.getProfile);
router.get('/:userId/relation', authMiddleware, userController.getRelationStatus);
router.post('/:targetUserId/follow', authMiddleware, userController.followUser);
router.delete('/:targetUserId/unfollow', authMiddleware, userController.unfollowUser);
router.put('/profile', authMiddleware, userController.updateProfile);
router.get('/:userId/followers', authMiddleware, userController.getFollowers);
router.get('/:userId/following', authMiddleware, userController.getFollowing);

module.exports = router;
