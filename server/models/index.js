const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
    process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/social_db',
    {
        dialect: 'postgres',
        logging: false
    }
);

module.exports = { sequelize };
