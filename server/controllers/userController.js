const { User, Post, Follow, Friendship } = require('../models/associations');
const { Op } = require('sequelize');

const buildRelationStatus = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId) {
        return {
            isOwnProfile: false,
            isFollowing: false,
            isFriend: false,
            friendshipStatus: 'none',
            friendshipDirection: null,
            friendshipId: null,
        };
    }

    if (String(currentUserId) === String(targetUserId)) {
        return {
            isOwnProfile: true,
            isFollowing: false,
            isFriend: false,
            friendshipStatus: 'self',
            friendshipDirection: null,
            friendshipId: null,
        };
    }

    const [follow, friendship] = await Promise.all([
        Follow.findOne({
            where: {
                followerId: currentUserId,
                followingId: targetUserId,
            },
        }),
        Friendship.findOne({
            where: {
                [Op.or]: [
                    { userId: currentUserId, friendId: targetUserId },
                    { userId: targetUserId, friendId: currentUserId },
                ],
            },
            order: [['createdAt', 'DESC']],
        }),
    ]);

    const friendshipDirection = friendship
        ? String(friendship.userId) === String(currentUserId)
            ? 'outgoing'
            : 'incoming'
        : null;

    return {
        isOwnProfile: false,
        isFollowing: Boolean(follow),
        isFriend: friendship?.status === 'accepted',
        friendshipStatus: friendship?.status || 'none',
        friendshipDirection,
        friendshipId: friendship?.id || null,
    };
};

// controllers/userController.js - УБЕДИМСЯ ЧТО АВАТАР ВКЛЮЧАЕТСЯ
exports.getProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        console.log('🔄 Getting profile for user:', userId);

        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Post,
                    limit: 10,
                    order: [['createdAt', 'DESC']]
                },
                {
                    model: User,
                    as: 'Followers',
                    attributes: ['id', 'username', 'name', 'avatar', 'isOnline'], // 🔥 ДОБАВЛЯЕМ avatar
                    through: { attributes: [] }
                },
                {
                    model: User,
                    as: 'Following',
                    attributes: ['id', 'username', 'name', 'avatar', 'isOnline'], // 🔥 ДОБАВЛЯЕМ avatar
                    through: { attributes: [] }
                }
            ]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('✅ User profile loaded with avatar:', user.avatar); // 🔥 ЛОГ АВАТАРА

        res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const currentUserId = req.userId;

        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Query must be at least 2 characters' });
        }

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { username: { [Op.iLike]: `%${query}%` } },  // По username
                    { name: { [Op.iLike]: `%${query}%` } }       // По имени
                ]
            },
            attributes: { exclude: ['password', 'email'] },
            limit: 20
        });

        const usersWithRelation = await Promise.all(
            users.map(async (user) => ({
                ...user.toJSON(),
                relation: await buildRelationStatus(currentUserId, user.id),
            }))
        );

        res.json({ users: usersWithRelation });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.followUser = async (req, res) => {
    try {
        const currentUserId = req.userId;
        const { targetUserId } = req.params;

        if (currentUserId === targetUserId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const [currentUser, targetUser] = await Promise.all([
            User.findByPk(currentUserId),
            User.findByPk(targetUserId)
        ]);

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const existingFollow = await Follow.findOne({
            where: {
                followerId: currentUserId,
                followingId: targetUserId
            }
        });

        if (existingFollow) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        await Follow.create({
            followerId: currentUserId,
            followingId: targetUserId
        });

        res.json({ message: 'Successfully followed user' });
    } catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.unfollowUser = async (req, res) => {
    try {
        const currentUserId = req.userId;
        const { targetUserId } = req.params;

        const result = await Follow.destroy({
            where: {
                followerId: currentUserId,
                followingId: targetUserId
            }
        });

        if (result === 0) {
            return res.status(404).json({ error: 'Follow relationship not found' });
        }

        res.json({ message: 'Successfully unfollowed user' });
    } catch (error) {
        console.error('Unfollow user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// controllers/userController.js - ДОБАВЛЯЕМ ОБНОВЛЕНИЕ АВАТАРА
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, username, bio, avatar } = req.body; // 🔥 ДОБАВЛЯЕМ avatar

        console.log('📝 Updating profile for user:', userId, { name, username, bio, avatar });

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Проверяем, не занят ли username другим пользователем
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ where: { username } });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already taken' });
            }
        }

        const nextValues = {
            name: typeof name === 'string' ? name.trim() || user.name : user.name,
            username: typeof username === 'string' ? username.trim() || user.username : user.username,
            bio: typeof bio === 'string' ? bio : user.bio,
        };

        if (Object.prototype.hasOwnProperty.call(req.body, 'avatar')) {
            nextValues.avatar = avatar || null;
        }

        await user.update({
            ...nextValues
        });

        console.log('✅ Profile updated successfully');

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
                bio: user.bio,
                avatar: user.avatar // 🔥 ВОЗВРАЩАЕМ АВАТАР
            }
        });
    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getFollowers = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.userId; // ID текущего пользователя

        const user = await User.findByPk(userId, {
            include: [{
                model: User,
                as: 'Followers',
                attributes: ['id', 'username', 'name', 'avatar', 'isOnline'],
                through: { attributes: [] }
            }]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 🔥 ПРОВЕРЯЕМ ПОДПИСКИ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
        const followersWithFollowStatus = await Promise.all(
            user.Followers.map(async (follower) => {
                const follow = await Follow.findOne({
                    where: {
                        followerId: currentUserId,
                        followingId: follower.id
                    }
                });

                return {
                    ...follower.toJSON(),
                    isFollowing: !!follow // true если текущий пользователь подписан на этого follower
                };
            })
        );

        res.json({ followers: followersWithFollowStatus });
    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getFollowing = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.userId; // ID текущего пользователя

        const user = await User.findByPk(userId, {
            include: [{
                model: User,
                as: 'Following',
                attributes: ['id', 'username', 'name', 'avatar', 'isOnline'],
                through: { attributes: [] }
            }]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 🔥 В ПОДПИСКАХ ВСЕГДА isFollowing = true (пользователь подписан на них)
        const followingWithFollowStatus = user.Following.map(following => ({
            ...following.toJSON(),
            isFollowing: true
        }));

        res.json({ following: followingWithFollowStatus });
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getRelationStatus = async (req, res) => {
    try {
        const currentUserId = req.userId;
        const { userId } = req.params;

        const targetUser = await User.findByPk(userId, {
            attributes: ['id'],
        });

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const relation = await buildRelationStatus(currentUserId, userId);

        res.json({ relation });
    } catch (error) {
        console.error('Get relation status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
