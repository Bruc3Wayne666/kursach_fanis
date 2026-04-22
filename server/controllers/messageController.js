// controllers/messageController.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const { Message, User, Conversation, ConversationMember } = require('../models/associations');
const { Op } = require('sequelize');

exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, content, messageType = 'text', conversationId } = req.body;
        const senderId = req.userId;

        console.log('📤 Sending message:', { receiverId, content, messageType, conversationId, senderId });

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        let message;

        if (conversationId) {
            // Сообщение в беседу
            const isMember = await ConversationMember.findOne({
                where: { conversationId, userId: senderId }
            });

            if (!isMember) {
                return res.status(403).json({ error: 'Not a member of this conversation' });
            }

            message = await Message.create({
                senderId,
                conversationId,
                content,
                messageType,
                isRead: false,
                receiverId: null // Для бесед receiverId = null
            });
        } else {
            // Личное сообщение
            if (!receiverId) {
                return res.status(400).json({ error: 'Receiver ID is required for personal messages' });
            }

            // Проверяем существование получателя
            const receiver = await User.findByPk(receiverId);
            if (!receiver) {
                console.log('❌ Receiver not found:', receiverId);
                return res.status(404).json({ error: 'Receiver not found' });
            }

            console.log('✅ Receiver found:', receiver.id);

            message = await Message.create({
                senderId,
                receiverId,
                content,
                messageType,
                isRead: false,
                conversationId: null // Для личных сообщений conversationId = null
            });

            console.log('✅ Message created:', message.id);
        }

        // Загружаем сообщение с отправителем
        const messageWithSender = await Message.findByPk(message.id, {
            include: [{
                model: User,
                as: 'Sender',
                attributes: ['id', 'username', 'name', 'avatar']
            }]
        });

        console.log('✅ Message with sender loaded');

        res.status(201).json({ message: messageWithSender });

    } catch (error) {
        console.error('❌ Send message error:', error);
        console.error('❌ Error details:', error.message);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
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
                conversationId: null, // Сразу ограничиваем, что это не групповой чат
                [Op.or]: [
                    {
                        // Вариант А: Я отправил Третьему
                        [Op.and]: [
                            { senderId: currentUserId },
                            { receiverId: otherUserId }
                        ]
                    },
                    {
                        // Вариант Б: Третий отправил мне
                        [Op.and]: [
                            { senderId: otherUserId },
                            { receiverId: currentUserId }
                        ]
                    }
                ]
            },
            include: [{
                model: User,
                as: 'Sender',
                attributes: ['id', 'username', 'name', 'avatar']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        // Помечаем прочитанными только те сообщения, что прислали МНЕ
        await Message.update(
            { isRead: true },
            {
                where: {
                    senderId: otherUserId,
                    receiverId: currentUserId,
                    conversationId: null,
                    isRead: false
                }
            }
        );

        res.json({ messages: messages.reverse() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// // controllers/messageController.js - ИСПРАВЛЯЕМ getChats С ПРАВИЛЬНЫМИ АССОЦИАЦИЯМИ
// exports.getChats = async (req, res) => {
//     try {
//         const currentUserId = req.userId;
//         console.log('🔄 Getting chats for user:', currentUserId);
//
//         // ЛИЧНЫЕ ЧАТЫ
//         const personalMessages = await Message.findAll({
//             where: {
//                 [Op.or]: [
//                     { senderId: currentUserId },
//                     { receiverId: currentUserId }
//                 ],
//                 conversationId: null
//             },
//             attributes: ['senderId', 'receiverId'],
//             raw: true
//         });
//
//         console.log('📨 Personal messages found:', personalMessages.length);
//
//         const partnerIds = [...new Set(
//             personalMessages.flatMap(chat =>
//                 [chat.senderId, chat.receiverId]
//             ).filter(id => id && id !== currentUserId)
//         )];
//
//         console.log('👥 Partner IDs for personal chats:', partnerIds);
//
//         const personalChats = await Promise.all(
//             partnerIds.map(async (partnerId) => {
//                 try {
//                     const partner = await User.findByPk(partnerId, {
//                         attributes: ['id', 'username', 'name', 'avatar', 'isOnline']
//                     });
//
//                     if (!partner) {
//                         console.log('❌ Partner not found:', partnerId);
//                         return null;
//                     }
//
//                     const lastMessage = await Message.findOne({
//                         where: {
//                             [Op.or]: [
//                                 {
//                                     senderId: currentUserId,
//                                     receiverId: partnerId,
//                                     conversationId: null
//                                 },
//                                 {
//                                     senderId: partnerId,
//                                     receiverId: currentUserId,
//                                     conversationId: null
//                                 }
//                             ]
//                         },
//                         order: [['createdAt', 'DESC']],
//                         include: [{
//                             model: User,
//                             as: 'Sender',
//                             attributes: ['id', 'username']
//                         }]
//                     });
//
//                     const unreadCount = await Message.count({
//                         where: {
//                             senderId: partnerId,
//                             receiverId: currentUserId,
//                             conversationId: null,
//                             isRead: false
//                         }
//                     });
//
//                     return {
//                         type: 'personal',
//                         partner,
//                         lastMessage,
//                         unreadCount,
//                         updatedAt: lastMessage?.createdAt || new Date()
//                     };
//                 } catch (error) {
//                     console.error('❌ Error loading chat details for partner:', partnerId, error);
//                     return null;
//                 }
//             })
//         );
//
//         // 🔥 БЕСЕДЫ - ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЕ АССОЦИАЦИИ
//         console.log('🔄 Getting conversations for user:', currentUserId);
//
//         const userConversations = await ConversationMember.findAll({
//             where: { userId: currentUserId },
//             include: [{
//                 model: Conversation,
//                 include: [{
//                     model: Message,
//                     as: 'Messages', // 🔥 ТЕПЕРЬ ЭТО ИМЯ СУЩЕСТВУЕТ
//                     limit: 1,
//                     order: [['createdAt', 'DESC']],
//                     include: [{
//                         model: User,
//                         as: 'Sender',
//                         attributes: ['id', 'name']
//                     }]
//                 }, {
//                     model: User,
//                     as: 'Members', // 🔥 ТЕПЕРЬ ЭТО ИМЯ СУЩЕСТВУЕТ
//                     attributes: ['id', 'username', 'name', 'avatar', 'isOnline'],
//                     through: { attributes: ['role'] }
//                 }]
//             }]
//         });
//
//         console.log('👥 User conversations found:', userConversations.length);
//
//         const conversationChats = await Promise.all(
//             userConversations.map(async (member) => {
//                 try {
//                     const conversation = member.Conversation;
//                     console.log('💬 Processing conversation:', conversation.id, conversation.name);
//
//                     const lastMessage = conversation.Messages?.[0] || null;
//                     console.log('📨 Last message in conversation:', lastMessage?.content);
//
//                     const unreadCount = await Message.count({
//                         where: {
//                             conversationId: conversation.id,
//                             senderId: { [Op.ne]: currentUserId },
//                             isRead: false
//                         }
//                     });
//
//                     return {
//                         type: 'group',
//                         conversation,
//                         lastMessage,
//                         unreadCount,
//                         updatedAt: lastMessage?.createdAt || conversation.createdAt
//                     };
//                 } catch (error) {
//                     console.error('❌ Error processing conversation member:', error);
//                     return null;
//                 }
//             })
//         );
//
//         console.log('✅ Conversation chats processed:', conversationChats.length);
//
//         // Фильтруем null значения
//         const validPersonalChats = personalChats.filter(chat => chat !== null);
//         const validConversationChats = conversationChats.filter(chat => chat !== null);
//
//         // Объединяем и сортируем
//         const allChats = [...validPersonalChats, ...validConversationChats];
//         allChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
//
//         console.log(`✅ Total chats: ${allChats.length} (${validPersonalChats.length} personal, ${validConversationChats.length} groups)`);
//
//         // 🔥 ЛОГИРУЕМ ВСЕ ЧАТЫ ДЛЯ ДЕБАГА
//         allChats.forEach((chat, index) => {
//             if (chat.type === 'group') {
//                 console.log(`🏷️ Group chat ${index + 1}:`, {
//                     id: chat.conversation.id,
//                     name: chat.conversation.name,
//                     members: chat.conversation.Members?.length,
//                     lastMessage: chat.lastMessage?.content
//                 });
//             }
//         });
//
//         res.json({ chats: allChats });
//
//     } catch (error) {
//         console.error('❌ Get chats error:', error);
//         console.error('❌ Error stack:', error.stack);
//         res.status(500).json({
//             error: 'Internal server error: ' + error.message,
//             stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//         });
//     }
// };

exports.getChats = async (req, res) => {
    try {
        const currentUserId = req.userId;

        // 1. Собираем все личные сообщения (conversationId IS NULL)
        const personalMessages = await Message.findAll({
            where: {
                [Op.or]: [{ senderId: currentUserId }, { receiverId: currentUserId }],
                conversationId: null
            },
            attributes: ['senderId', 'receiverId'],
            raw: true
        });

        // Получаем только уникальные ID людей, с кем общались
        const partnerIds = [...new Set(
            personalMessages.flatMap(m => [m.senderId, m.receiverId])
                .filter(id => id && id !== currentUserId)
        )];

        // 2. Формируем личные чаты
        const personalChats = await Promise.all(
            partnerIds.map(async (partnerId) => {
                const partner = await User.findByPk(partnerId, {
                    attributes: ['id', 'username', 'name', 'avatar', 'isOnline']
                });
                if (!partner) return null;

                const lastMessage = await Message.findOne({
                    where: {
                        [Op.or]: [
                            { senderId: currentUserId, receiverId: partnerId, conversationId: null },
                            { senderId: partnerId, receiverId: currentUserId, conversationId: null }
                        ]
                    },
                    order: [['createdAt', 'DESC']],
                    include: [{ model: User, as: 'Sender', attributes: ['id', 'name'] }]
                });

                const unreadCount = await Message.count({
                    where: {
                        senderId: partnerId,
                        receiverId: currentUserId,
                        conversationId: null,
                        isRead: false
                    }
                });

                return {
                    type: 'personal',
                    id: partnerId, // Ключевой ID для фильтрации
                    partner,
                    lastMessage,
                    unreadCount,
                    updatedAt: lastMessage?.createdAt || new Date()
                };
            })
        );

        // 3. Собираем групповые беседы
        const userConversations = await ConversationMember.findAll({
            where: { userId: currentUserId },
            include: [{
                model: Conversation,
                include: [
                    {
                        model: Message,
                        as: 'Messages',
                        limit: 1,
                        order: [['createdAt', 'DESC']],
                        include: [{ model: User, as: 'Sender', attributes: ['id', 'name'] }]
                    },
                    {
                        model: User,
                        as: 'Members',
                        attributes: ['id', 'username', 'name', 'avatar', 'isOnline'],
                        through: { attributes: ['role'] }
                    }
                ]
            }]
        });

        const groupChats = await Promise.all(
            userConversations.map(async (member) => {
                const conv = member.Conversation;
                const lastMsg = conv.Messages?.[0] || null;

                const unreadCount = await Message.count({
                    where: {
                        conversationId: conv.id,
                        senderId: { [Op.ne]: currentUserId },
                        isRead: false
                    }
                });

                return {
                    type: 'group',
                    id: conv.id, // Ключевой ID для фильтрации
                    conversation: conv,
                    lastMessage: lastMsg,
                    unreadCount,
                    updatedAt: lastMsg?.createdAt || conv.createdAt
                };
            })
        );

        // 4. ГЛОБАЛЬНАЯ ФИЛЬТРАЦИЯ ДУБЛИКАТОВ
        const allChatsRaw = [...personalChats.filter(c => c), ...groupChats];

        const seenIds = new Set();
        const finalChats = [];

        for (const chat of allChatsRaw) {
            // Если это личный чат, проверяем по ID партнера.
            // Если группа - по ID беседы.
            const uniqueKey = `${chat.type}_${chat.id}`;

            if (!seenIds.has(uniqueKey)) {
                seenIds.add(uniqueKey);
                finalChats.push(chat);
            }
        }

        // Сортировка: новые сверху
        finalChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        res.json({ chats: finalChats });

    } catch (error) {
        console.error('Final getChats error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const currentUserId = req.userId;
        const { page = 1, limit = 50 } = req.query;

        console.log('🔄 Getting conversation messages:', conversationId);

        // Проверяем что пользователь участник беседы
        const isMember = await ConversationMember.findOne({
            where: { conversationId, userId: currentUserId }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const offset = (page - 1) * limit;

        const messages = await Message.findAll({
            where: { conversationId },
            include: [{
                model: User,
                as: 'Sender',
                attributes: ['id', 'username', 'name', 'avatar']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        console.log(`✅ Found ${messages.length} conversation messages`);

        // Помечаем как прочитанные
        await Message.update(
            { isRead: true },
            {
                where: {
                    conversationId,
                    senderId: { [Op.ne]: currentUserId },
                    isRead: false
                }
            }
        );

        res.json({ messages: messages.reverse() });
    } catch (error) {
        console.error('❌ Get conversation messages error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

// Остальные методы остаются без изменений
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
