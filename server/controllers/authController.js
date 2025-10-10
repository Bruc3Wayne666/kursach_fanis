const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' }
    );
};

exports.register = async (req, res) => {
    try {
        const { username, email, password, name } = req.body;

        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const user = await User.create({
            username,
            email,
            password,
            name
        });

        const token = generateToken(user.id);

        res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log(req.body)

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        await user.update({ isOnline: true });

        const token = generateToken(user.id);

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                bio: user.bio,
                isOnline: true
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);

        if (user) {
            await user.update({ isOnline: false });
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
