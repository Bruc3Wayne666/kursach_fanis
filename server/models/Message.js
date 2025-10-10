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
    }
});

module.exports = Message;
