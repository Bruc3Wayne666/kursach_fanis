const User = require('./User');
const Post = require('./Post');
const Follow = require('./Follow');
const Message = require('./Message');
const Comment = require('./Comment'); // Добавляем импорт Comment
const Like = require('./Like'); // ✅ ДОБАВИТЬ ЭТУ СТРОКУ

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

// ✅ ДОБАВЛЯЕМ КОММЕНТАРИИ
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


module.exports = {
    User,
    Post,
    Follow,
    Message,
    Comment,
    Like
};
