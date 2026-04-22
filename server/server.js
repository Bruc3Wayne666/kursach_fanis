const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const os = require('os');
const multer = require('multer');
const fs = require('fs');

const { sequelize } = require('./models/index');
require('./models/associations');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');
const commentRoutes = require('./routes/comments');
const conversationRoutes = require('./routes/conversations'); // 🔥 НОВЫЙ
const friendsRoutes = require('./routes/friends'); // 🔥 НОВЫЙ
const aiRoutes = require('./routes/ai');

dotenv.config();

const app = express();
const server = http.createServer(app);
// Создаем папку uploads если нет
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const ensureMessageTypeEnumValues = async () => {
    try {
        await sequelize.query(
            `ALTER TYPE "enum_Messages_messageType" ADD VALUE IF NOT EXISTS 'audio';`
        );
    } catch (error) {
        if (!String(error.message).includes('already exists')) {
            throw error;
        }
    }
};

// Настройка CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Роуты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', commentRoutes);
app.use('/api/conversations', conversationRoutes); // 🔥 НОВЫЙ
app.use('/api/friends', friendsRoutes); // 🔥 НОВЫЙ
app.use('/api/ai', aiRoutes);

// Роут для загрузки файлов
app.post('/api/upload', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 }
]), (req, res) => {
    try {
        const uploadedFile = req.files?.image?.[0] || req.files?.file?.[0];
        console.log('📤 Загрузка файла:', uploadedFile);

        if (!uploadedFile) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${uploadedFile.filename}`;
        console.log('✅ Файл загружен:', fileUrl);

        res.json({
            url: fileUrl,
            filename: uploadedFile.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running!',
        timestamp: new Date().toISOString(),
        clientIp: req.ip
    });
});

// Логирование доступных IP адресов
const networkInterfaces = os.networkInterfaces();
console.log('🌐 Available network interfaces:');
Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(interface => {
        if (interface.family === 'IPv4' && !interface.internal) {
            console.log(`   ${interfaceName}: http://${interface.address}:${process.env.PORT || 5000}`);
        }
    });
});

const PORT = process.env.PORT || 5000;

sequelize.sync({ force: false })
    .then(async () => {
        await ensureMessageTypeEnumValues();
        console.log('✅ Database connected and synced');
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on all interfaces (0.0.0.0) port ${PORT}`);
            console.log(`📱 Use this IP for mobile: http://192.168.0.116:5000`);
        });
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
    });
