const { Message, User } = require('../models/associations');
const jwt = require('jsonwebtoken');

const activeUsers = new Map();

exports.setupSocket = (io) => {
    io.engine.on("headers", (headers, req) => {
        headers["Content-Security-Policy"] = "connect-src * 'unsafe-inline' ws: wss: http: https:";
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Socket-ID";
    });

    io.on('connection', (socket) => {
        console.log('🔌 NEW SOCKET CONNECTION:', socket.id);
        console.log('📡 Headers:', socket.handshake.headers);
        console.log('🔑 Auth data:', socket.handshake.auth);

        socket.on('auth', async (data) => {
            try {
                console.log('🔐 AUTH ATTEMPT:', {
                    userId: data.userId,
                    socketId: socket.id,
                    hasToken: !!data.token
                });

                const { userId, token } = data;

                if (!token) {
                    throw new Error('No token provided');
                }

                // Проверяем токен
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

                if (decoded.userId !== userId) {
                    throw new Error('Token user ID mismatch');
                }

                const user = await User.findByPk(userId);
                if (!user) {
                    console.log('❌ User not found:', userId);
                    socket.emit('auth_error', { message: 'User not found' });
                    return;
                }

                await user.update({ isOnline: true });

                socket.userId = userId;
                activeUsers.set(userId, socket.id);

                console.log(`✅ USER AUTHENTICATED: ${user.name} (${userId})`);
                console.log(`👥 Active users: ${activeUsers.size}`);

                socket.emit('auth_success', {
                    user: {
                        id: user.id,
                        username: user.username
                    },
                    socketId: socket.id
                });

                // Тестовое сообщение
                socket.emit('welcome', {
                    message: 'Connected to server!',
                    serverTime: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ AUTH ERROR:', error.message);
                socket.emit('auth_error', { message: 'Auth failed: ' + error.message });
            }
        });

        socket.on('send_message', async (messageData) => {
            try {
                if (!socket.userId) {
                    console.log('❌ Send message failed: Not authenticated');
                    socket.emit('error', { message: 'Not authenticated' });
                    return;
                }

                const { receiverId, content, messageType = 'text' } = messageData;

                console.log('📤 SENDING MESSAGE:', {
                    from: socket.userId,
                    to: receiverId,
                    type: messageType,
                    content: messageType === 'text' ? content.substring(0, 50) : '[IMAGE]'
                });

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

                // Отправляем получателю
                const receiverSocketId = activeUsers.get(receiverId);
                if (receiverSocketId) {
                    console.log(`📨 Delivering to receiver ${receiverId} (socket: ${receiverSocketId})`);
                    io.to(receiverSocketId).emit('new_message', messageWithUsers);
                } else {
                    console.log(`⚠️  Receiver ${receiverId} not connected`);
                }

                // Подтверждение отправителю
                socket.emit('message_sent', messageWithUsers);

                console.log('✅ MESSAGE SENT SUCCESSFULLY');

            } catch (error) {
                console.error('❌ SEND MESSAGE ERROR:', error);
                socket.emit('error', { message: 'Failed to send: ' + error.message });
            }
        });

        // Диагностические события
        socket.on('ping', (data) => {
            console.log('🏓 PING received from:', socket.userId);
            socket.emit('pong', {
                ...data,
                serverTime: Date.now(),
                socketId: socket.id
            });
        });

        socket.on('disconnect', async (reason) => {
            console.log('❌ DISCONNECTED:', socket.id, 'Reason:', reason);
            console.log('👤 User was:', socket.userId);

            if (socket.userId) {
                activeUsers.delete(socket.userId);
                console.log(`👥 Active users after disconnect: ${activeUsers.size}`);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('❌ SOCKET ERROR:', error);
        });
    });

    console.log('✅ WebSocket server ready for connections');
};
