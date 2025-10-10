const express = require('express');
const commentController = require('../controllers/commentController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/:postId/comments', commentController.createComment);
router.get('/:postId/comments', commentController.getComments);

module.exports = router;
