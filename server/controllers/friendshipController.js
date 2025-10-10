// controllers/friendshipController.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const { Friendship, User } = require('../models/associations');
const { Op } = require('sequelize');

exports.sendFriendRequest = async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const userId = req.userId;

        console.log('📤 Sending friend request:', { userId, targetUserId });

        if (userId === targetUserId) {
            return res.status(400).json({ error: 'Cannot send friend request to yourself' });
        }

        const targetUser = await User.findByPk(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 🔥 ИСПРАВЛЯЕМ ПРОВЕРКУ СУЩЕСТВУЮЩИХ ЗАПРОСОВ
        const existingRequest = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { userId, friendId: targetUserId },
                    { userId: targetUserId, friendId: userId }
                ]
            }
        });

        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return res.status(400).json({ error: 'Friend request already sent' });
            } else if (existingRequest.status === 'accepted') {
                return res.status(400).json({ error: 'Already friends' });
            } else if (existingRequest.status === 'rejected') {
                // Если запрос был отклонен, можно отправить новый
                await existingRequest.destroy();
            }
        }

        const friendship = await Friendship.create({
            userId,
            friendId: targetUserId,
            status: 'pending'
        });

        console.log('✅ Friend request created:', friendship.id);

        res.json({
            message: 'Friend request sent successfully',
            requestId: friendship.id
        });

    } catch (error) {
        console.error('❌ Send friend request error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

exports.acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.userId;

        console.log('✅ Accepting friend request:', requestId);

        const request = await Friendship.findOne({
            where: {
                id: requestId,
                friendId: userId, // Запрос должен быть направлен текущему пользователю
                status: 'pending'
            }
        });

        if (!request) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        await request.update({ status: 'accepted' });

        res.json({ message: 'Friend request accepted' });

    } catch (error) {
        console.error('❌ Accept friend request error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

exports.rejectFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.userId;

        console.log('❌ Rejecting friend request:', requestId);

        const request = await Friendship.findOne({
            where: {
                id: requestId,
                friendId: userId,
                status: 'pending'
            }
        });

        if (!request) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        await request.update({ status: 'rejected' });

        res.json({ message: 'Friend request rejected' });

    } catch (error) {
        console.error('❌ Reject friend request error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

exports.getFriends = async (req, res) => {
    try {
        const userId = req.userId;

        console.log('🔄 Getting friends for user:', userId);

        // 🔥 ИСПРАВЛЯЕМ ЗАПРОС ДЛЯ ПОЛУЧЕНИЯ ДРУЗЕЙ
        const friendships = await Friendship.findAll({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { userId: userId },
                    { friendId: userId }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'User',
                    attributes: ['id', 'username', 'name', 'avatar', 'isOnline', 'bio']
                },
                {
                    model: User,
                    as: 'Friend',
                    attributes: ['id', 'username', 'name', 'avatar', 'isOnline', 'bio']
                }
            ]
        });

        console.log(`✅ Found ${friendships.length} friendships`);

        // Форматируем ответ чтобы всегда показывать друга (не текущего пользователя)
        const friends = friendships.map(friendship => {
            const isUserInitiator = friendship.userId === userId;
            const friend = isUserInitiator ? friendship.Friend : friendship.User;

            return {
                ...friend.toJSON(),
                friendshipId: friendship.id,
                isInitiator: isUserInitiator
            };
        });

        console.log(`✅ Formatted ${friends.length} friends`);

        res.json({ friends });

    } catch (error) {
        console.error('❌ Get friends error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

exports.getFriendRequests = async (req, res) => {
    try {
        const userId = req.userId;
        const { type = 'received' } = req.query; // 'received' или 'sent'

        console.log('📨 Getting friend requests, type:', type);

        let requests;

        if (type === 'sent') {
            // Запросы отправленные текущим пользователем
            requests = await Friendship.findAll({
                where: {
                    userId: userId,
                    status: 'pending'
                },
                include: [{
                    model: User,
                    as: 'Friend',
                    attributes: ['id', 'username', 'name', 'avatar', 'isOnline', 'bio']
                }]
            });
        } else {
            // Запросы полученные текущим пользователем
            requests = await Friendship.findAll({
                where: {
                    friendId: userId,
                    status: 'pending'
                },
                include: [{
                    model: User,
                    as: 'User',
                    attributes: ['id', 'username', 'name', 'avatar', 'isOnline', 'bio']
                }]
            });
        }

        console.log(`✅ Found ${requests.length} ${type} requests`);

        res.json({ requests });

    } catch (error) {
        console.error('❌ Get friend requests error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

exports.removeFriend = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const userId = req.userId;

        console.log('🗑️ Removing friendship:', friendshipId);

        const friendship = await Friendship.findOne({
            where: {
                id: friendshipId,
                status: 'accepted',
                [Op.or]: [
                    { userId: userId },
                    { friendId: userId }
                ]
            }
        });

        if (!friendship) {
            return res.status(404).json({ error: 'Friendship not found' });
        }

        await friendship.destroy();

        res.json({ message: 'Friend removed successfully' });

    } catch (error) {
        console.error('❌ Remove friend error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};
