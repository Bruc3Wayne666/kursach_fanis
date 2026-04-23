const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Community = sequelize.define('Community', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    avatar: {
        type: DataTypes.STRING,
        defaultValue: null
    }
});

module.exports = Community;
