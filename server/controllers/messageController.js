const { Message, User } = require('../models/associations');
const { Op } = require('sequelize');

exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, content, messageType = 'text' } = req.body;
        const senderId = req.userId;

        if (!receiverId || !content) {
            return res.status(400).json({ error: 'Receiver ID and content are required' });
        }

        const receiver = await User.findByPk(receiverId);
        if (!receiver) {
            return res.status(404).json({ error: 'Receiver not found' });
        }

        const message = await Message.create({
            senderId,
            receiverId,
            content,
            messageType,
            isRead: false
        });

        const messageWithUsers = await Message.findByPk(message.id, {
            include: [
                {
                    model: User,
                    as: 'Sender',
                    attributes: ['id', 'username', 'name', 'avatar']
                },
                {
                    model: User,
                    as: 'Receiver',
                    attributes: ['id', 'username', 'name', 'avatar']
                }
            ]
        });

        const io = req.app.get('io');
        const receiverSocketId = Array.from(io.sockets.sockets.values())
            .find(socket => socket.userId === receiverId)?.id;

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('new_message', messageWithUsers);
        }

        io.to(req.socketId).emit('message_sent', messageWithUsers);

        res.status(201).json({ message: messageWithUsers });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getChatHistory = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const currentUserId = req.userId;
        const { page = 1, limit = 50 } = req.query;

        const offset = (page - 1) * limit;

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    {
                        senderId: currentUserId,
                        receiverId: otherUserId
                    },
                    {
                        senderId: otherUserId,
                        receiverId: currentUserId
                    }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'Sender',
                    attributes: ['id', 'username', 'name', 'avatar']
                },
                {
                    model: User,
                    as: 'Receiver',
                    attributes: ['id', 'username', 'name', 'avatar']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        await Message.update(
            { isRead: true },
            {
                where: {
                    senderId: otherUserId,
                    receiverId: currentUserId,
                    isRead: false
                }
            }
        );

        res.json({ messages: messages.reverse() });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getChats = async (req, res) => {
    try {
        const currentUserId = req.userId;

        const chatPartners = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderId: currentUserId },
                    { receiverId: currentUserId }
                ]
            },
            attributes: ['senderId', 'receiverId'],
            raw: true
        });

        const partnerIds = [...new Set(
            chatPartners.flatMap(chat =>
                [chat.senderId, chat.receiverId]
            ).filter(id => id !== currentUserId)
        )];

        const chats = await Promise.all(
            partnerIds.map(async (partnerId) => {
                const partner = await User.findByPk(partnerId, {
                    attributes: ['id', 'username', 'name', 'avatar', 'isOnline']
                });

                const lastMessage = await Message.findOne({
                    where: {
                        [Op.or]: [
                            {
                                senderId: currentUserId,
                                receiverId: partnerId
                            },
                            {
                                senderId: partnerId,
                                receiverId: currentUserId
                            }
                        ]
                    },
                    order: [['createdAt', 'DESC']],
                    include: [
                        {
                            model: User,
                            as: 'Sender',
                            attributes: ['id', 'username']
                        }
                    ]
                });

                const unreadCount = await Message.count({
                    where: {
                        senderId: partnerId,
                        receiverId: currentUserId,
                        isRead: false
                    }
                });

                return {
                    partner,
                    lastMessage,
                    unreadCount,
                    updatedAt: lastMessage?.createdAt || new Date()
                };
            })
        );

        chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        res.json({ chats });
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { messageIds } = req.body;
        const currentUserId = req.userId;

        await Message.update(
            { isRead: true },
            {
                where: {
                    id: messageIds,
                    receiverId: currentUserId
                }
            }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const currentUserId = req.userId;

        const message = await Message.findOne({
            where: {
                id: messageId,
                senderId: currentUserId
            }
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        await message.destroy();

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
