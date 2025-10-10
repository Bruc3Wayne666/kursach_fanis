// models/Conversation.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatar: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    isGroup: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    description: {
        type: DataTypes.TEXT,
        defaultValue: ''
    }
});

module.exports = Conversation;
