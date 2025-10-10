// models/Message.js - ОБНОВЛЕННАЯ ВЕРСИЯ
const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    messageType: {
        type: DataTypes.ENUM('text', 'image'),
        defaultValue: 'text'
    },
    // 🔥 ДОБАВЛЯЕМ conversationId для групповых чатов
    conversationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Conversations',
            key: 'id'
        }
    },
    // 🔥 ОСТАВЛЯЕМ receiverId для личных сообщений
    receiverId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    }
}, {
    // Добавляем индексы для оптимизации
    indexes: [
        {
            fields: ['senderId']
        },
        {
            fields: ['receiverId']
        },
        {
            fields: ['conversationId']
        },
        {
            fields: ['createdAt']
        }
    ]
});

module.exports = Message;
