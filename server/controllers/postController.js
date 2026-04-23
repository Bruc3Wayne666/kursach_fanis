const { Op } = require('sequelize');
const {User, Post, Comment, Like, Follow, Community, CommunitySubscription} = require('../models/associations');

const postIncludes = [
    {
        model: User,
        attributes: ['id', 'username', 'name', 'avatar']
    },
    {
        model: Community,
        attributes: ['id', 'name', 'avatar', 'description', 'ownerId'],
        include: [{
            model: User,
            as: 'Owner',
            attributes: ['id', 'username', 'name', 'avatar'],
        }]
    },
    {
        model: User,
        as: 'Likers',
        attributes: ['id'],
        through: {attributes: []}
    }
];

const decoratePosts = async (posts, currentUserId) => Promise.all(
    posts.map(async (post) => {
        const commentCount = await Comment.count({
            where: { postId: post.id }
        });

        const isLiked = post.Likers.some(liker => String(liker.id) === String(currentUserId));

        return {
            ...post.toJSON(),
            commentsCount: commentCount,
            isLiked,
        };
    })
);

exports.createPost = async (req, res) => {
    try {
        const {content, image, communityId} = req.body;
        const userId = req.userId;

        if (!content && !image) {
            return res.status(400).json({error: 'Content or image is required'});
        }

        if (communityId) {
            const community = await Community.findByPk(communityId);
            if (!community) {
                return res.status(404).json({ error: 'Community not found' });
            }

            if (String(community.ownerId) !== String(userId)) {
                return res.status(403).json({ error: 'Only community admin can create posts' });
            }
        }

        const post = await Post.create({
            content,
            image,
            userId,
            communityId: communityId || null,
        });

        const postWithUser = await Post.findByPk(post.id, {
            include: postIncludes
        });

        const [decoratedPost] = await decoratePosts([postWithUser], userId);

        res.status(201).json({post: decoratedPost});
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};

exports.getFeed = async (req, res) => {
    try {
        const userId = req.userId;
        const {page = 1, limit = 10} = req.query;

        const offset = (page - 1) * limit;

        const [user, subscriptions, ownedCommunities] = await Promise.all([
            User.findByPk(userId, {
                include: [{
                    model: User,
                    as: 'Following',
                    attributes: ['id']
                }]
            }),
            CommunitySubscription.findAll({
                where: { userId },
                attributes: ['communityId'],
            }),
            Community.findAll({
                where: { ownerId: userId },
                attributes: ['id'],
            }),
        ]);

        const followingIds = user.Following.map(follow => follow.id);
        followingIds.push(userId);
        const communityIds = [
            ...subscriptions.map((subscription) => subscription.communityId),
            ...ownedCommunities.map((community) => community.id),
        ];

        const posts = await Post.findAll({
            where: {
                [Op.or]: [
                    {
                        userId: followingIds,
                        communityId: null,
                    },
                    communityIds.length > 0 ? {
                        communityId: communityIds,
                    } : null,
                ].filter(Boolean),
            },
            include: postIncludes,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        const postsWithCounts = await decoratePosts(posts, userId);

        res.json({posts: postsWithCounts});
    } catch (error) {
        console.error('Get feed error:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};

exports.getUserPosts = async (req, res) => {
    try {
        const {userId} = req.params;
        const currentUserId = req.userId; // ID того, кто смотрит (из мидлвара auth)
        const {page = 1, limit = 10} = req.query;

        const offset = (page - 1) * limit;

        const posts = await Post.findAll({
            where: {
                userId,
                communityId: null,
            },
            include: postIncludes,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        const postsWithData = await decoratePosts(posts, currentUserId);

        res.json({ posts: postsWithData });
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};

exports.deletePost = async (req, res) => {
    try {
        const {postId} = req.params;
        const userId = req.userId;

        const post = await Post.findByPk(postId, {
            include: [{
                model: Community,
                attributes: ['id', 'ownerId'],
            }]
        });

        if (!post) {
            return res.status(404).json({error: 'Post not found'});
        }

        const canDelete = String(post.userId) === String(userId)
            || String(post.Community?.ownerId) === String(userId);

        if (!canDelete) {
            return res.status(403).json({ error: 'Not enough permissions to delete the post' });
        }

        await post.destroy();

        res.json({message: 'Post deleted successfully'});
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};


exports.likePost = async (req, res) => {
    try {
        const {postId} = req.params;
        const userId = req.userId;

        const post = await Post.findByPk(postId);
        if (!post) {
            return res.status(404).json({error: 'Post not found'});
        }

        // Проверяем не лайкнул ли уже
        const existingLike = await Like.findOne({
            where: {userId, postId}
        });

        if (existingLike) {
            return res.status(400).json({error: 'Post already liked'});
        }

        // Создаем лайк
        await Like.create({
            userId,
            postId
        });

        // Обновляем счетчик
        await post.update({
            likesCount: post.likesCount + 1
        });

        res.json({message: 'Post liked', likesCount: post.likesCount});
    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};

exports.unlikePost = async (req, res) => {
    try {
        const {postId} = req.params;
        const userId = req.userId;

        const post = await Post.findByPk(postId);
        if (!post) {
            return res.status(404).json({error: 'Post not found'});
        }

        // Находим и удаляем лайк
        const like = await Like.findOne({
            where: {userId, postId}
        });

        if (!like) {
            return res.status(400).json({error: 'Post not liked'});
        }

        await like.destroy();

        // Обновляем счетчик
        await post.update({
            likesCount: Math.max(0, post.likesCount - 1)
        });

        res.json({message: 'Post unliked', likesCount: post.likesCount});
    } catch (error) {
        console.error('Unlike post error:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};


exports.toggleLike = async (req, res) => {
    try {
        const {postId} = req.params;
        const userId = req.userId;

        // 1. Ищем лайк в базе
        const existingLike = await Like.findOne({where: {userId, postId}});
        const post = await Post.findByPk(postId);

        if (existingLike) {
            // Если есть — удаляем (дизлайк)
            await existingLike.destroy();
            await post.decrement('likesCount');
            return res.json({isLiked: false, likesCount: post.likesCount - 1});
        } else {
            // Если нет — создаем (лайк)
            await Like.create({userId, postId});
            await post.increment('likesCount');
            return res.json({isLiked: true, likesCount: post.likesCount + 1});
        }
    } catch (error) {
        res.status(500).json({error: 'Ошибка сервера'});
    }
};

exports.getCommunityPosts = async (req, res) => {
    try {
        const { communityId } = req.params;
        const currentUserId = req.userId;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const community = await Community.findByPk(communityId);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        const posts = await Post.findAll({
            where: { communityId },
            include: postIncludes,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            posts: await decoratePosts(posts, currentUserId),
        });
    } catch (error) {
        console.error('Get community posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
