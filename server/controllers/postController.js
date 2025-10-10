// УБЕДИСЬ ЧТО ТАК ИМПОРТИРУЕШЬ
const { User, Post, Comment, Like } = require('../models/associations');

exports.createPost = async (req, res) => {
    try {
        const { content, image } = req.body;
        const userId = req.userId;

        if (!content && !image) {
            return res.status(400).json({ error: 'Content or image is required' });
        }

        const post = await Post.create({
            content,
            image,
            userId
        });

        const postWithUser = await Post.findByPk(post.id, {
            include: [{
                model: User,
                attributes: ['id', 'username', 'name', 'avatar']
            }]
        });

        res.status(201).json({ post: postWithUser });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getFeed = async (req, res) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        const user = await User.findByPk(userId, {
            include: [{
                model: User,
                as: 'Following',
                attributes: ['id']
            }]
        });

        const followingIds = user.Following.map(follow => follow.id);
        followingIds.push(userId);

        const posts = await Post.findAll({
            where: {
                userId: followingIds
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'name', 'avatar']
                },
                {
                    model: User,
                    as: 'Likers',
                    attributes: ['id'],
                    through: { attributes: [] } // Не включаем данные из таблицы Like
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        // Подсчет комментариев и проверка лайков
        const postsWithCounts = await Promise.all(
            posts.map(async (post) => {
                const commentCount = await Comment.count({
                    where: { postId: post.id }
                });

                // Проверяем лайкнул ли текущий пользователь этот пост
                const isLiked = post.Likers.some(liker => liker.id === userId);

                return {
                    ...post.toJSON(),
                    commentsCount: commentCount,
                    isLiked: isLiked
                };
            })
        );

        res.json({ posts: postsWithCounts });
    } catch (error) {
        console.error('Get feed error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        const posts = await Post.findAll({
            where: { userId },
            include: [{
                model: User,
                attributes: ['id', 'username', 'name', 'avatar']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        // 🔥 ТОЖЕ ДОБАВЛЯЕМ ПОДСЧЕТ КОММЕНТАРИЕВ
        const postsWithCommentCount = await Promise.all(
            posts.map(async (post) => {
                const commentCount = await Comment.count({
                    where: { postId: post.id }
                });

                return {
                    ...post.toJSON(),
                    commentsCount: commentCount
                };
            })
        );

        res.json({ posts: postsWithCommentCount });
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;

        const post = await Post.findOne({
            where: { id: postId, userId }
        });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        await post.destroy();

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.likePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;

        const post = await Post.findByPk(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Проверяем не лайкнул ли уже
        const existingLike = await Like.findOne({
            where: { userId, postId }
        });

        if (existingLike) {
            return res.status(400).json({ error: 'Post already liked' });
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

        res.json({ message: 'Post liked', likesCount: post.likesCount });
    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.unlikePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;

        const post = await Post.findByPk(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Находим и удаляем лайк
        const like = await Like.findOne({
            where: { userId, postId }
        });

        if (!like) {
            return res.status(400).json({ error: 'Post not liked' });
        }

        await like.destroy();

        // Обновляем счетчик
        await post.update({
            likesCount: Math.max(0, post.likesCount - 1)
        });

        res.json({ message: 'Post unliked', likesCount: post.likesCount });
    } catch (error) {
        console.error('Unlike post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
