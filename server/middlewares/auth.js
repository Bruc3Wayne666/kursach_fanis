const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findByPk(decoded.userId, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.userId = user.id;
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};
