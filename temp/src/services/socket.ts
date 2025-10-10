import io, { Socket } from 'socket.io-client';
import { storageHelper } from '../utils/storage';

class SocketService {
    private socket: Socket | null = null;
    private messageCallbacks: ((message: any) => void)[] = [];
    private isConnecting = false;

    connect() {
        if (this.socket?.connected) {
            console.log('⏩ Socket already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('⏳ Socket connection in progress...');
            return;
        }

        this.isConnecting = true;
        const token = storageHelper.getToken();
        const user = storageHelper.getUser();

        console.log('🎯 STARTING SOCKET CONNECTION...');
        console.log('🔑 Token exists:', !!token);
        console.log('👤 User exists:', !!user);
        console.log('🌐 Connecting to: http://192.168.0.116:5000');

        if (!token || !user) {
            console.log('❌ No token or user for socket connection');
            this.isConnecting = false;
            return;
        }

        this.socket = io('http://192.168.0.116:5000', {
            auth: {
                token,
                userId: user.id
            },
            transports: ['websocket', 'polling'],
            timeout: 10000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('✅ SOCKET CONNECTED:', this.socket?.id);
            this.isConnecting = false;

            // Авторизуемся
            this.socket?.emit('auth', {
                userId: user.id,
                token
            });
        });

        this.socket.on('auth_success', (data) => {
            console.log('✅ AUTH SUCCESS:', data);
        });

        this.socket.on('auth_error', (error) => {
            console.error('❌ AUTH ERROR:', error);
            this.isConnecting = false;
        });

        this.socket.on('welcome', (data) => {
            console.log('👋 WELCOME FROM SERVER:', data);
        });

        this.socket.on('new_message', (message: any) => {
            console.log('💬 NEW MESSAGE FROM SERVER:', message);
            this.messageCallbacks.forEach(callback => callback(message));
        });

        this.socket.on('message_sent', (message: any) => {
            console.log('✅ MESSAGE SENT CONFIRMATION:', message);
        });

        this.socket.on('pong', (data) => {
            console.log('🏓 PONG FROM SERVER:', data);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ SOCKET DISCONNECTED:', reason);
            this.isConnecting = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ CONNECTION ERROR:', error.message);
            console.error('❌ ERROR TYPE:', error.type);
            console.error('❌ ERROR CODE:', error.code);
            console.error('❌ FULL ERROR:', error);
            this.isConnecting = false;
        });
    }

    onMessage(callback: (message: any) => void) {
        this.messageCallbacks.push(callback);
        return () => {
            this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
        };
    }

    sendMessage(messageData: any) {
        if (!this.socket?.connected) {
            console.error('❌ Cannot send: socket not connected');
            return false;
        }

        console.log('📤 SENDING MESSAGE VIA SOCKET:', messageData);
        this.socket.emit('send_message', messageData);
        return true;
    }

    ping() {
        if (this.socket?.connected) {
            console.log('🏓 Sending PING...');
            this.socket.emit('ping', { clientTime: Date.now() });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.messageCallbacks = [];
        this.isConnecting = false;
    }

    get connected() {
        return this.socket?.connected || false;
    }
}

export const socketService = new SocketService();
