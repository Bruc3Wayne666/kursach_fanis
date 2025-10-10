const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const { sequelize } = require('./models/index');
require('./models/associations');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');
const commentRoutes = require('./routes/comments');

const { setupSocket } = require('./sockets/socket');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set('io', io);

app.use(cors({
    origin: '*', // Или твой конкретный IP
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
    req.socketId = req.headers['socket-id'];
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', commentRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running!',
        timestamp: new Date().toISOString()
    });
});

setupSocket(io);

const PORT = process.env.PORT || 5000;

sequelize.sync({ force: false })
    .then(() => {
        console.log('✅ Database connected and synced');
        console.log('✅ Models:', Object.keys(sequelize.models));
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
    });
