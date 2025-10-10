const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Follow = sequelize.define('Follow', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    }
});

module.exports = Follow;
