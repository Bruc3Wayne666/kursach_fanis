const { Op } = require('sequelize');
const {
    Community,
    CommunitySubscription,
    Post,
    User,
} = require('../models/associations');

const ownerAttributes = ['id', 'username', 'name', 'avatar'];

const buildCommunityPayload = async (community, currentUserId) => {
    const communityJson = community.toJSON ? community.toJSON() : community;
    const [postsCount, subscribersCount, subscription] = await Promise.all([
        Post.count({ where: { communityId: communityJson.id } }),
        CommunitySubscription.count({ where: { communityId: communityJson.id } }),
        currentUserId
            ? CommunitySubscription.findOne({
                where: {
                    userId: currentUserId,
                    communityId: communityJson.id,
                }
            })
            : null,
    ]);

    return {
        ...communityJson,
        postsCount,
        subscribersCount,
        isSubscribed: Boolean(subscription) || String(communityJson.ownerId) === String(currentUserId),
        isOwner: String(communityJson.ownerId) === String(currentUserId),
    };
};

exports.createCommunity = async (req, res) => {
    try {
        const ownerId = req.userId;
        const { name, description, avatar } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'Название паблика обязательно' });
        }

        const community = await Community.create({
            name: String(name).trim(),
            description: typeof description === 'string' ? description.trim() : '',
            avatar: avatar || null,
            ownerId,
        });

        const loadedCommunity = await Community.findByPk(community.id, {
            include: [{
                model: User,
                as: 'Owner',
                attributes: ownerAttributes,
            }],
        });

        res.status(201).json({
            community: await buildCommunityPayload(loadedCommunity, ownerId),
        });
    } catch (error) {
        console.error('Create community error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.searchCommunities = async (req, res) => {
    try {
        const { query } = req.query;
        const currentUserId = req.userId;

        if (!query || String(query).trim().length < 2) {
            return res.status(400).json({ error: 'Query must be at least 2 characters' });
        }

        const communities = await Community.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${query}%` } },
                    { description: { [Op.iLike]: `%${query}%` } },
                ],
            },
            include: [{
                model: User,
                as: 'Owner',
                attributes: ownerAttributes,
            }],
            order: [['createdAt', 'DESC']],
            limit: 20,
        });

        const payload = await Promise.all(
            communities.map((community) => buildCommunityPayload(community, currentUserId))
        );

        res.json({ communities: payload });
    } catch (error) {
        console.error('Search communities error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getMyCommunities = async (req, res) => {
    try {
        const ownerId = req.userId;
        const communities = await Community.findAll({
            where: { ownerId },
            include: [{
                model: User,
                as: 'Owner',
                attributes: ownerAttributes,
            }],
            order: [['createdAt', 'DESC']],
        });

        res.json({
            communities: await Promise.all(
                communities.map((community) => buildCommunityPayload(community, ownerId))
            ),
        });
    } catch (error) {
        console.error('Get my communities error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getSubscribedCommunities = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId, {
            include: [{
                model: Community,
                as: 'SubscribedCommunities',
                include: [{
                    model: User,
                    as: 'Owner',
                    attributes: ownerAttributes,
                }],
                through: { attributes: [] },
            }],
        });

        const owned = await Community.findAll({
            where: { ownerId: userId },
            include: [{
                model: User,
                as: 'Owner',
                attributes: ownerAttributes,
            }],
        });

        const allCommunities = [
            ...(user?.SubscribedCommunities || []),
            ...owned,
        ].filter((community, index, self) =>
            index === self.findIndex((item) => String(item.id) === String(community.id))
        );

        res.json({
            communities: await Promise.all(
                allCommunities.map((community) => buildCommunityPayload(community, userId))
            ),
        });
    } catch (error) {
        console.error('Get subscribed communities error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getCommunity = async (req, res) => {
    try {
        const { communityId } = req.params;
        const currentUserId = req.userId;

        const community = await Community.findByPk(communityId, {
            include: [{
                model: User,
                as: 'Owner',
                attributes: ownerAttributes,
            }],
        });

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        res.json({
            community: await buildCommunityPayload(community, currentUserId),
        });
    } catch (error) {
        console.error('Get community error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateCommunity = async (req, res) => {
    try {
        const { communityId } = req.params;
        const userId = req.userId;
        const { name, description, avatar } = req.body;

        const community = await Community.findByPk(communityId);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        if (String(community.ownerId) !== String(userId)) {
            return res.status(403).json({ error: 'Only admin can edit the community' });
        }

        await community.update({
            name: typeof name === 'string' && name.trim() ? name.trim() : community.name,
            description: typeof description === 'string' ? description.trim() : community.description,
            avatar: Object.prototype.hasOwnProperty.call(req.body, 'avatar') ? (avatar || null) : community.avatar,
        });

        const loadedCommunity = await Community.findByPk(communityId, {
            include: [{
                model: User,
                as: 'Owner',
                attributes: ownerAttributes,
            }],
        });

        res.json({
            community: await buildCommunityPayload(loadedCommunity, userId),
        });
    } catch (error) {
        console.error('Update community error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.subscribeToCommunity = async (req, res) => {
    try {
        const userId = req.userId;
        const { communityId } = req.params;

        const community = await Community.findByPk(communityId);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        if (String(community.ownerId) === String(userId)) {
            return res.status(400).json({ error: 'Admin already follows the community' });
        }

        const existingSubscription = await CommunitySubscription.findOne({
            where: {
                userId,
                communityId,
            },
        });

        if (existingSubscription) {
            return res.status(400).json({ error: 'Already subscribed to this community' });
        }

        await CommunitySubscription.create({
            userId,
            communityId,
        });

        const loadedCommunity = await Community.findByPk(communityId, {
            include: [{
                model: User,
                as: 'Owner',
                attributes: ownerAttributes,
            }],
        });

        res.json({
            community: await buildCommunityPayload(loadedCommunity, userId),
        });
    } catch (error) {
        console.error('Subscribe to community error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.unsubscribeFromCommunity = async (req, res) => {
    try {
        const userId = req.userId;
        const { communityId } = req.params;

        const community = await Community.findByPk(communityId);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        if (String(community.ownerId) === String(userId)) {
            return res.status(400).json({ error: 'Admin cannot unsubscribe from own community' });
        }

        const deleted = await CommunitySubscription.destroy({
            where: {
                userId,
                communityId,
            },
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        const loadedCommunity = await Community.findByPk(communityId, {
            include: [{
                model: User,
                as: 'Owner',
                attributes: ownerAttributes,
            }],
        });

        res.json({
            community: await buildCommunityPayload(loadedCommunity, userId),
        });
    } catch (error) {
        console.error('Unsubscribe from community error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
