const { Message, User } = require('../models/associations');

const activeUsers = new Map();

exports.setupSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('🔌 User connected:', socket.id);

        socket.on('auth', async (data) => {
            try {
                const { userId, token } = data;

                const user = await User.findByPk(userId);
                if (!user) {
                    socket.emit('auth_error', { message: 'User not found' });
                    return;
                }

                await user.update({ isOnline: true });

                socket.userId = userId;
                activeUsers.set(userId, socket.id);

                console.log(`👤 User ${userId} authenticated with socket ${socket.id}`);

                socket.broadcast.emit('user_online', {
                    userId,
                    isOnline: true
                });

                socket.emit('auth_success', { user: { id: user.id, username: user.username } });
            } catch (error) {
                console.error('WebSocket auth error:', error);
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });

        socket.on('send_message', async (messageData) => {
            try {
                if (!socket.userId) {
                    socket.emit('error', { message: 'Not authenticated' });
                    return;
                }

                const { receiverId, content, messageType = 'text' } = messageData;

                const message = await Message.create({
                    senderId: socket.userId,
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

                const receiverSocketId = activeUsers.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('new_message', messageWithUsers);
                }

                socket.emit('message_sent', messageWithUsers);

            } catch (error) {
                console.error('WebSocket send message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on('typing_start', async (data) => {
            try {
                const { chatId, receiverId } = data;
                if (!socket.userId) return;

                const receiverSocketId = activeUsers.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('user_typing', {
                        chatId,
                        userId: socket.userId
                    });
                }
            } catch (error) {
                console.error('Typing start error:', error);
            }
        });

        socket.on('typing_stop', async (data) => {
            try {
                const { chatId, receiverId } = data;
                if (!socket.userId) return;

                const receiverSocketId = activeUsers.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('user_stop_typing', {
                        chatId,
                        userId: socket.userId
                    });
                }
            } catch (error) {
                console.error('Typing stop error:', error);
            }
        });

        socket.on('messages_read', async (data) => {
            try {
                const { messageIds, chatId } = data;
                if (!socket.userId) return;

                await Message.update(
                    { isRead: true },
                    {
                        where: {
                            id: messageIds,
                            receiverId: socket.userId
                        }
                    }
                );

                const messages = await Message.findAll({ where: { id: messageIds } });
                const senderIds = [...new Set(messages.map(m => m.senderId))];

                senderIds.forEach(senderId => {
                    const senderSocketId = activeUsers.get(senderId);
                    if (senderSocketId) {
                        io.to(senderSocketId).emit('messages_read_confirmation', {
                            messageIds,
                            readerId: socket.userId,
                            chatId
                        });
                    }
                });

            } catch (error) {
                console.error('Messages read error:', error);
            }
        });

        socket.on('disconnect', async () => {
            console.log('❌ User disconnected:', socket.id);

            if (socket.userId) {
                activeUsers.delete(socket.userId);

                try {
                    const user = await User.findByPk(socket.userId);
                    if (user) {
                        await user.update({ isOnline: false });
                    }

                    socket.broadcast.emit('user_offline', {
                        userId: socket.userId,
                        isOnline: false
                    });
                } catch (error) {
                    console.error('Disconnect update error:', error);
                }
            }
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });
};
