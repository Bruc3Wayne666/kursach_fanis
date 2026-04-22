// store/slices/conversationsSlice.ts - УПРОЩЕННАЯ ВЕРСИЯ
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export const leaveConversation = createAsyncThunk(
    'conversations/leaveConversation',
    async (conversationId: string, { rejectWithValue }) => {
        try {
            console.log('🔄 Redux: Leaving conversation...');
            const response = await api.delete(`/conversations/${conversationId}/leave`);
            return { conversationId, data: response.data };
        } catch (error: any) {
            console.error('❌ Redux leave error:', error.response?.data);
            return rejectWithValue(error.response?.data?.error || 'Failed to leave conversation');
        }
    }
);

const conversationsSlice = createSlice({
    name: 'conversations',
    initialState: {
        conversations: [] as any[],
        loading: false,
        error: null as string | null,
    },
    reducers: {
        removeConversation: (state, action) => {
            state.conversations = state.conversations.filter(
                conv => conv.id !== action.payload
            );
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(leaveConversation.fulfilled, (state, action) => {
                state.conversations = state.conversations.filter(
                    conv => conv.id !== action.payload.conversationId
                );
            })
            .addCase(leaveConversation.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const { removeConversation, clearError } = conversationsSlice.actions;
export default conversationsSlice.reducer;
