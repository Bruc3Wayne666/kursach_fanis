// models/ConversationMember.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const ConversationMember = sequelize.define('ConversationMember', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    role: {
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member'
    },
    joinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = ConversationMember;
