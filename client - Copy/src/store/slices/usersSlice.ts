import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export const searchUsers = createAsyncThunk(
    'users/searchUsers',
    async (query: string, { rejectWithValue }) => {
        try {
            const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
            return response.data.users;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Search failed');
        }
    }
);

export const followUser = createAsyncThunk(
    'users/followUser',
    async (targetUserId: string, { rejectWithValue }) => {
        try {
            await api.post(`/users/${targetUserId}/follow`);
            return targetUserId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Follow failed');
        }
    }
);

export const unfollowUser = createAsyncThunk(
    'users/unfollowUser',
    async (targetUserId: string, { rejectWithValue }) => {
        try {
            await api.delete(`/users/${targetUserId}/unfollow`);
            return targetUserId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Unfollow failed');
        }
    }
);

const usersSlice = createSlice({
    name: 'users',
    initialState: {
        searchResults: [] as any[],
        searchLoading: false,
        searchError: null as string | null,
    },
    reducers: {
        clearSearch: (state) => {
            state.searchResults = [];
            state.searchError = null;
        },
        // 🔥 ДОБАВЛЯЕМ РЕДЮСЕР ДЛЯ ЛОКАЛЬНОГО ОБНОВЛЕНИЯ ПОДПИСКИ
        updateUserFollowStatus: (state, action) => {
            const { userId, isFollowing } = action.payload;
            const user = state.searchResults.find(u => u.id === userId);
            if (user) {
                user.isFollowing = isFollowing;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Search users
            .addCase(searchUsers.pending, (state) => {
                state.searchLoading = true;
                state.searchError = null;
            })
            .addCase(searchUsers.fulfilled, (state, action) => {
                state.searchLoading = false;
                state.searchResults = action.payload;
            })
            .addCase(searchUsers.rejected, (state, action) => {
                state.searchLoading = false;
                state.searchError = action.payload as string;
            })
            // Follow user - ОБНОВЛЯЕМ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ
            .addCase(followUser.fulfilled, (state, action) => {
                const userId = action.payload;
                const user = state.searchResults.find(u => u.id === userId);
                if (user) {
                    user.isFollowing = true;
                }
            })
            // Unfollow user - ОБНОВЛЯЕМ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ
            .addCase(unfollowUser.fulfilled, (state, action) => {
                const userId = action.payload;
                const user = state.searchResults.find(u => u.id === userId);
                if (user) {
                    user.isFollowing = false;
                }
            });
    },
});

export const { clearSearch, updateUserFollowStatus } = usersSlice.actions;
export default usersSlice.reducer;
