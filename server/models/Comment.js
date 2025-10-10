const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Comment = sequelize.define('Comment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

module.exports = Comment;
