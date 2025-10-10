const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatar: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    bio: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    isOnline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            user.password = await bcrypt.hash(user.password, 12);
        }
    }
});

User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = User;
