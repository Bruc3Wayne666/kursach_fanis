const { Conversation, User, ConversationMember, Message } = require('../models/associations');
const { Op } = require('sequelize');

const loadConversationForResponse = async (conversationId) => Conversation.findByPk(conversationId, {
    include: [{
        model: User,
        as: 'Members',
        attributes: ['id', 'username', 'name', 'avatar', 'isOnline'],
        through: { attributes: ['role', 'joinedAt'] }
    }]
});

const ensureAdminExists = async (conversationId) => {
    const adminCount = await ConversationMember.count({
        where: {
            conversationId,
            role: 'admin'
        }
    });

    if (adminCount > 0) {
        return;
    }

    const nextAdmin = await ConversationMember.findOne({
        where: { conversationId },
        order: [['createdAt', 'ASC']]
    });

    if (nextAdmin) {
        await nextAdmin.update({ role: 'admin' });
    }
};

const getNormalizedMemberIds = (memberIds = [], creatorId = null) => (
    [...new Set((Array.isArray(memberIds) ? memberIds : []).filter(Boolean))]
        .filter((memberId) => String(memberId) !== String(creatorId))
);

exports.createConversation = async (req, res) => {
    try {
        const { name, memberIds, description } = req.body;
        const creatorId = req.userId;
        const normalizedMemberIds = getNormalizedMemberIds(memberIds, creatorId);

        if (normalizedMemberIds.length < 1) {
            return res.status(400).json({ error: 'Select at least 1 participant' });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Conversation name is required' });
        }

        const members = await User.findAll({
            where: { id: { [Op.in]: normalizedMemberIds } }
        });

        if (members.length !== normalizedMemberIds.length) {
            return res.status(404).json({ error: 'Some users not found' });
        }

        const conversation = await Conversation.create({
            name: name.trim(),
            description: typeof description === 'string' ? description.trim() : '',
            isGroup: true
        });

        await ConversationMember.create({
            userId: creatorId,
            conversationId: conversation.id,
            role: 'admin'
        });

        await Promise.all(
            normalizedMemberIds.map((memberId) => ConversationMember.create({
                userId: memberId,
                conversationId: conversation.id,
                role: 'member'
            }))
        );

        const conversationWithMembers = await loadConversationForResponse(conversation.id);

        res.status(201).json({
            message: 'Conversation created successfully',
            conversation: conversationWithMembers
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ error: 'Failed to create conversation: ' + error.message });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const userId = req.userId;

        const conversations = await Conversation.findAll({
            include: [{
                model: User,
                as: 'Members',
                where: { id: userId },
                attributes: [],
                through: { attributes: [] }
            }, {
                model: User,
                as: 'Members',
                attributes: ['id', 'username', 'name', 'avatar', 'isOnline'],
                through: { attributes: ['role'] }
            }, {
                model: Message,
                as: 'Messages',
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

exports.getConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;

        const isMember = await ConversationMember.findOne({
            where: { conversationId, userId }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const conversation = await loadConversationForResponse(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({ conversation });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.addMembers = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { memberIds } = req.body;
        const userId = req.userId;

        const adminMembership = await ConversationMember.findOne({
            where: {
                conversationId,
                userId,
                role: 'admin'
            }
        });

        if (!adminMembership) {
            return res.status(403).json({ error: 'Only admin can add members' });
        }

        const normalizedMemberIds = getNormalizedMemberIds(memberIds, userId);

        if (normalizedMemberIds.length === 0) {
            return res.status(400).json({ error: 'Select at least 1 user' });
        }

        const users = await User.findAll({
            where: { id: { [Op.in]: normalizedMemberIds } }
        });

        if (users.length !== normalizedMemberIds.length) {
            return res.status(404).json({ error: 'Some users not found' });
        }

        const existingMembers = await ConversationMember.findAll({
            where: {
                conversationId,
                userId: { [Op.in]: normalizedMemberIds }
            }
        });

        const existingMemberIds = new Set(existingMembers.map((member) => String(member.userId)));
        const newMemberIds = normalizedMemberIds.filter((memberId) => !existingMemberIds.has(String(memberId)));

        if (newMemberIds.length === 0) {
            return res.status(400).json({ error: 'All users are already members' });
        }

        await Promise.all(
            newMemberIds.map((memberId) => ConversationMember.create({
                userId: memberId,
                conversationId,
                role: 'member'
            }))
        );

        const conversation = await loadConversationForResponse(conversationId);

        res.json({
            message: 'Members added successfully',
            conversation
        });
    } catch (error) {
        console.error('Add members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const { conversationId, memberId } = req.params;
        const userId = req.userId;

        const adminMembership = await ConversationMember.findOne({
            where: {
                conversationId,
                userId,
                role: 'admin'
            }
        });

        if (!adminMembership) {
            return res.status(403).json({ error: 'Only admin can remove members' });
        }

        if (String(memberId) === String(userId)) {
            return res.status(400).json({ error: 'Use leave conversation action for yourself' });
        }

        const targetMembership = await ConversationMember.findOne({
            where: {
                conversationId,
                userId: memberId
            }
        });

        if (!targetMembership) {
            return res.status(404).json({ error: 'Member not found' });
        }

        await targetMembership.destroy();
        await ensureAdminExists(conversationId);

        const conversation = await loadConversationForResponse(conversationId);

        res.json({
            message: 'Member removed successfully',
            conversation
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { name, avatar, description } = req.body;
        const userId = req.userId;

        const adminMembership = await ConversationMember.findOne({
            where: {
                conversationId,
                userId,
                role: 'admin'
            }
        });

        if (!adminMembership) {
            return res.status(403).json({ error: 'Only admin can update conversation' });
        }

        const conversation = await Conversation.findByPk(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const updates = {};

        if (typeof name === 'string' && name.trim()) {
            updates.name = name.trim();
        }

        if (typeof description === 'string') {
            updates.description = description.trim();
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'avatar')) {
            updates.avatar = avatar || null;
        }

        await conversation.update(updates);

        const updatedConversation = await loadConversationForResponse(conversationId);

        res.json({
            message: 'Conversation updated successfully',
            conversation: updatedConversation
        });
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.leaveConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;

        const membership = await ConversationMember.findOne({
            where: { conversationId, userId }
        });

        if (!membership) {
            return res.status(404).json({ error: 'You are not a member of this conversation' });
        }

        const memberCount = await ConversationMember.count({
            where: { conversationId }
        });

        if (memberCount === 1) {
            await Conversation.destroy({ where: { id: conversationId } });

            return res.json({
                message: 'Successfully left the conversation',
                deleted: true
            });
        }

        const wasAdmin = membership.role === 'admin';

        await membership.destroy();

        if (wasAdmin) {
            await ensureAdminExists(conversationId);
        }

        const conversation = await loadConversationForResponse(conversationId);

        res.json({
            message: 'Successfully left the conversation',
            deleted: false,
            conversation
        });
    } catch (error) {
        console.error('Leave conversation error:', error);
        res.status(500).json({ error: 'Failed to leave conversation: ' + error.message });
    }
};
