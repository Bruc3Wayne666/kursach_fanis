const express = require('express');
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/rewrite-message', aiController.rewriteMessage);

module.exports = router;
