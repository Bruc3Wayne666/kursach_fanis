// controllers/conversationController.js
const { Conversation, User, ConversationMember, Message } = require('../models/associations');
const { Op } = require('sequelize');

exports.createConversation = async (req, res) => {
    try {
        const { name, memberIds, description } = req.body;
        const creatorId = req.userId;

        console.log('🔄 Creating NEW conversation:', {
            name,
            memberIds: memberIds || [],
            memberCount: memberIds ? memberIds.length : 0,
            description,
            creatorId
        });

        // Валидация
        if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
            return res.status(400).json({ error: 'Select at least 2 participants' });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Conversation name is required' });
        }

        // 🔥 ГАРАНТИРУЕМ УНИКАЛЬНОСТЬ БЕСЕДЫ ПОСРЕДСТВОМ ТОЧНОЙ ВРЕМЕННОЙ МЕТКИ
        const uniqueName = `${name.trim()}_${Date.now()}`;

        // Проверяем только существование пользователей
        const members = await User.findAll({
            where: { id: { [Op.in]: memberIds } }
        });

        if (members.length !== memberIds.length) {
            return res.status(404).json({ error: 'Some users not found' });
        }

        // 🔥 ВСЕГДА СОЗДАЁМ НОВУЮ БЕСЕДУ - ПРИ ЭТОМ ПРЕДОСТАВЛЯЕМ УНИКАЛЬНОЕ ИМЯ
        const conversation = await Conversation.create({
            name: uniqueName,
            description: description?.trim() || `Conversation created by ${req.user.name}`,
            isGroup: true
        });

        console.log('✅ NEW conversation created with ID:', conversation.id, 'Name:', uniqueName);

        // Добавляем создателя как админа
        await ConversationMember.create({
            userId: creatorId,
            conversationId: conversation.id,
            role: 'admin'
        });

        // Добавляем участников
        const memberPromises = memberIds.map(memberId =>
            ConversationMember.create({
                userId: memberId,
                conversationId: conversation.id,
                role: 'member'
            })
        );

        await Promise.all(memberPromises);

        console.log(`✅ Added ${memberIds.length + 1} members to NEW conversation`);

        // Загружаем данные для ответа
        const conversationWithMembers = await Conversation.findByPk(conversation.id, {
            include: [
                {
                    model: User,
                    as: 'Members',
                    attributes: ['id', 'username', 'name', 'avatar', 'isOnline'],
                    through: { attributes: ['role'] }
                }
            ]
        });

        res.status(201).json({
            message: 'New conversation created successfully',
            conversation: conversationWithMembers
        });

    } catch (error) {
        console.error('❌ Create NEW conversation error:', error);
        res.status(500).json({ error: 'Failed to create conversation: ' + error.message });
    }
};


// controllers/conversationController.js - ОБНОВЛЯЕМ getConversations
exports.getConversations = async (req, res) => {
    try {
        const userId = req.userId;

        const conversations = await Conversation.findAll({
            include: [{
                model: User,
                as: 'Members', // 🔥 ИСПОЛЬЗУЕМ ПРАВИЛЬНОЕ ИМЯ
                where: { id: userId },
                attributes: [],
                through: { attributes: [] }
            }, {
                model: User,
                as: 'Members', // 🔥 ИСПОЛЬЗУЕМ ПРАВИЛЬНОЕ ИМЯ
                attributes: ['id', 'username', 'name', 'avatar', 'isOnline'],
                through: { attributes: ['role'] }
            }, {
                model: Message,
                as: 'Messages', // 🔥 ИСПОЛЬЗУЕМ ПРАВИЛЬНОЕ ИМЯ
                limit: 1,
                order: [['createdAt', 'DESC']],
                include: [{
                    model: User,
                    as: 'Sender',
                    attributes: ['id', 'name']
                }]
            }],
            order: [[{ model: Message, as: 'Messages' }, 'createdAt', 'DESC']]
        });

        // Добавляем количество непрочитанных сообщений
        const conversationsWithUnread = await Promise.all(
            conversations.map(async (conversation) => {
                const unreadCount = await Message.count({
                    where: {
                        conversationId: conversation.id,
                        senderId: { [Op.ne]: userId },
                        isRead: false
                    }
                });

                return {
                    ...conversation.toJSON(),
                    unreadCount
                };
            })
        );

        res.json({ conversations: conversationsWithUnread });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.addMembers = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { memberIds } = req.body;
        const userId = req.userId;

        // Проверяем права (только админ может добавлять)
        const member = await ConversationMember.findOne({
            where: {
                conversationId,
                userId,
                role: 'admin'
            }
        });

        if (!member) {
            return res.status(403).json({ error: 'Only admin can add members' });
        }

        const existingMembers = await ConversationMember.findAll({
            where: {
                conversationId,
                userId: { [Op.in]: memberIds }
            }
        });

        const existingMemberIds = existingMembers.map(m => m.userId);
        const newMemberIds = memberIds.filter(id => !existingMemberIds.includes(id));

        if (newMemberIds.length === 0) {
            return res.status(400).json({ error: 'All users are already members' });
        }

        const memberPromises = newMemberIds.map(memberId =>
            ConversationMember.create({
                userId: memberId,
                conversationId,
                role: 'member'
            })
        );

        await Promise.all(memberPromises);

        res.json({ message: 'Members added successfully' });
    } catch (error) {
        console.error('Add members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;

        // Проверяем что пользователь участник беседы
        const isMember = await ConversationMember.findOne({
            where: { conversationId, userId }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const conversation = await Conversation.findByPk(conversationId, {
            include: [{
                model: User,
                as: 'Members',
                attributes: ['id', 'username', 'name', 'avatar', 'isOnline'],
                through: { attributes: ['role'] }
            }]
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({ conversation });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// В conversationController.js ДОБАВЬ:
exports.updateConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { name, avatar, description } = req.body;
        const userId = req.userId;

        // Проверяем что пользователь админ беседы
        const member = await ConversationMember.findOne({
            where: {
                conversationId,
                userId,
                role: 'admin'
            }
        });

        if (!member) {
            return res.status(403).json({ error: 'Only admin can update conversation' });
        }

        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        await conversation.update({
            name: name || conversation.name,
            avatar: avatar || conversation.avatar,
            description: description || conversation.description
        });

        res.json({ message: 'Conversation updated successfully', conversation });
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
