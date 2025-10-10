const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    image: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    likesCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

module.exports = Post;
