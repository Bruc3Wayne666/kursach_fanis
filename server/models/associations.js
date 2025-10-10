// models/associations.js - ИСПРАВЛЯЕМ АССОЦИАЦИИ
const User = require('./User');
const Post = require('./Post');
const Follow = require('./Follow');
const Message = require('./Message');
const Comment = require('./Comment');
const Like = require('./Like');
const Conversation = require('./Conversation');
const ConversationMember = require('./ConversationMember');
const Friendship = require('./Friendship');

// User - Post (один ко многим)
User.hasMany(Post, { foreignKey: 'userId', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'userId' });

// Подписки (многие ко многим через Follow)
User.belongsToMany(User, {
    through: Follow,
    as: 'Followers',
    foreignKey: 'followingId'
});

User.belongsToMany(User, {
    through: Follow,
    as: 'Following',
    foreignKey: 'followerId'
});

// Сообщения
User.hasMany(Message, { foreignKey: 'senderId', as: 'SentMessages' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'ReceivedMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

// Комментарии
User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId' });
Post.hasMany(Comment, { foreignKey: 'postId', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

// Лайки
User.belongsToMany(Post, {
    through: Like,
    as: 'LikedPosts',
    foreignKey: 'userId'
});

Post.belongsToMany(User, {
    through: Like,
    as: 'Likers',
    foreignKey: 'postId'
});

// 🔥 ИСПРАВЛЯЕМ АССОЦИАЦИИ ДЛЯ БЕСЕД - ДОБАВЛЯЕМ as
User.belongsToMany(Conversation, {
    through: ConversationMember,
    as: 'Conversations',
    foreignKey: 'userId'
});

Conversation.belongsToMany(User, {
    through: ConversationMember,
    as: 'Members',
    foreignKey: 'conversationId'
});

// 🔥 ВАЖНО: ДОБАВЛЯЕМ as ДЛЯ СООБЩЕНИЙ БЕСЕД
Conversation.hasMany(Message, {
    foreignKey: 'conversationId',
    onDelete: 'CASCADE',
    as: 'Messages' // 🔥 ДОБАВЛЯЕМ ЭТОТ as
});

Message.belongsTo(Conversation, {
    foreignKey: 'conversationId',
    as: 'Conversation' // 🔥 ДОБАВЛЯЕМ as
});

// 🔥 ДОБАВЛЯЕМ АССОЦИАЦИИ ДЛЯ ConversationMember
ConversationMember.belongsTo(Conversation, {
    foreignKey: 'conversationId'
});

ConversationMember.belongsTo(User, {
    foreignKey: 'userId'
});

Conversation.hasMany(ConversationMember, {
    foreignKey: 'conversationId',
    as: 'ConversationMembers' // 🔥 ДОБАВЛЯЕМ as
});

User.hasMany(ConversationMember, {
    foreignKey: 'userId',
    as: 'UserConversations' // 🔥 ДОБАВЛЯЕМ as
});

// 🔥 НОВЫЕ АССОЦИАЦИИ ДЛЯ ДРУЗЕЙ
User.belongsToMany(User, {
    through: Friendship,
    as: 'Friends',
    foreignKey: 'userId'
});

User.belongsToMany(User, {
    through: Friendship,
    as: 'FriendOf',
    foreignKey: 'friendId'
});

// АССОЦИАЦИИ ДЛЯ FRIENDSHIP
User.hasMany(Friendship, {
    foreignKey: 'userId',
    as: 'SentFriendRequests'
});

User.hasMany(Friendship, {
    foreignKey: 'friendId',
    as: 'ReceivedFriendRequests'
});

Friendship.belongsTo(User, {
    foreignKey: 'userId',
    as: 'User'
});

Friendship.belongsTo(User, {
    foreignKey: 'friendId',
    as: 'Friend'
});

module.exports = {
    User,
    Post,
    Follow,
    Message,
    Comment,
    Like,
    Conversation,
    ConversationMember,
    Friendship
};
