const express = require('express');
const  postController  = require('../controllers/postController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.post('/', authMiddleware, postController.createPost);
router.get('/feed', authMiddleware, postController.getFeed);
router.get('/user/:userId', authMiddleware, postController.getUserPosts);
router.delete('/:postId', authMiddleware, postController.deletePost);
// router.post('/:postId/like', authMiddleware, postController.likePost);
// router.delete('/:postId/like', authMiddleware, postController.unlikePost);
router.post('/:postId/toggle-like', authMiddleware, postController.toggleLike);

module.exports = router;
