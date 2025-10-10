import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// В store/slices/messagesSlice.ts проверяем getChats
export const getChats = createAsyncThunk(
    'messages/getChats',
    async (_, { rejectWithValue }) => {
        try {
            console.log('🔄 getChats: Fetching chats from server...');
            const response = await api.get('/messages/chats');
            console.log('✅ getChats: Server response:', response.data);
            return response.data.chats;
        } catch (error: any) {
            console.error('❌ getChats error:', error);
            return rejectWithValue(error.response?.data?.error || 'Failed to get chats');
        }
    }
);

export const getChatHistory = createAsyncThunk(
    'messages/getChatHistory',
    async (otherUserId: string, { rejectWithValue }) => {
        try {
            const response = await api.get(`/messages/chat/${otherUserId}`);
            return { messages: response.data.messages, otherUserId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to get chat history');
        }
    }
);

const messagesSlice = createSlice({
    name: 'messages',
    initialState: {
        chats: [] as any[],
        activeChat: null as string | null,
        messages: {} as Record<string, any[]>,
        loading: false,
        error: null as string | null,
    },
    reducers: {
        setActiveChat: (state, action) => {
            state.activeChat = action.payload;
        },
        addMessage: (state, action) => {
            const { message, chatId } = action.payload;
            const targetChatId = chatId || message.receiverId || message.senderId;

            if (!state.messages[targetChatId]) {
                state.messages[targetChatId] = [];
            }

            const messageExists = state.messages[targetChatId].some(msg =>
                msg.id === message.id ||
                (msg.content === message.content &&
                    msg.senderId === message.senderId &&
                    Math.abs(new Date(msg.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000)
            );

            if (!messageExists) {
                state.messages[targetChatId].push(message);

                state.messages[targetChatId].sort((a, b) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
            }
        },
        markMessagesAsRead: (state, action) => {
            const { messageIds, chatId } = action.payload;
            if (state.messages[chatId]) {
                state.messages[chatId] = state.messages[chatId].map(msg =>
                    messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
                );
            }
        },
        clearMessages: (state) => {
            state.messages = {};
            state.activeChat = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getChats.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getChats.fulfilled, (state, action) => {
                state.loading = false;
                state.chats = action.payload;
            })
            .addCase(getChats.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(getChatHistory.fulfilled, (state, action) => {
                const { messages, otherUserId } = action.payload;
                state.messages[otherUserId] = messages;
            });
    },
});

export const {
    setActiveChat,
    addMessage,
    markMessagesAsRead,
    clearMessages
} = messagesSlice.actions;

export default messagesSlice.reducer;
