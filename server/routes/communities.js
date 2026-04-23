const express = require('express');
const communityController = require('../controllers/communityController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.post('/', authMiddleware, communityController.createCommunity);
router.get('/search', authMiddleware, communityController.searchCommunities);
router.get('/my', authMiddleware, communityController.getMyCommunities);
router.get('/subscribed', authMiddleware, communityController.getSubscribedCommunities);
router.get('/:communityId', authMiddleware, communityController.getCommunity);
router.put('/:communityId', authMiddleware, communityController.updateCommunity);
router.post('/:communityId/subscribe', authMiddleware, communityController.subscribeToCommunity);
router.delete('/:communityId/subscribe', authMiddleware, communityController.unsubscribeFromCommunity);

module.exports = router;
