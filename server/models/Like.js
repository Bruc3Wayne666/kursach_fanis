const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Like = sequelize.define('Like', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    }
});

module.exports = Like;
