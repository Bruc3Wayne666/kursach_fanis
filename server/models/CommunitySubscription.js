const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const CommunitySubscription = sequelize.define('CommunitySubscription', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    }
});

module.exports = CommunitySubscription;
