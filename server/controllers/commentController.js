const { Comment, User, Post } = require('../models/associations');

exports.createComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.userId;

        console.log('📝 Creating comment:', { postId, content, userId });

        // Проверим что пост существует
        const post = await Post.findByPk(postId);
        if (!post) {
            console.log('❌ Post not found:', postId);
            return res.status(404).json({ error: 'Post not found' });
        }

        const comment = await Comment.create({
            content,
            userId,
            postId
        });

        console.log('✅ Comment created:', comment.id);

        const commentWithUser = await Comment.findByPk(comment.id, {
            include: [{
                model: User,
                attributes: ['id', 'username', 'name', 'avatar']
            }]
        });

        console.log('✅ Comment with user:', commentWithUser);

        res.json({ comment: commentWithUser });
    } catch (error) {
        console.error('❌ Create comment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getComments = async (req, res) => {
    try {
        const { postId } = req.params;

        const comments = await Comment.findAll({
            where: { postId },
            include: [{
                model: User,
                attributes: ['id', 'username', 'name', 'avatar']
            }],
            order: [['createdAt', 'ASC']]
        });

        res.json({ comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
