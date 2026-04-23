// src/store/slices/usersSlice.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export const searchUsers = createAsyncThunk(
    'users/searchUsers',
    async (query: string, { rejectWithValue }) => {
        try {
            const [usersResponse, communitiesResponse] = await Promise.all([
                api.get(`/users/search?query=${encodeURIComponent(query)}`),
                api.get(`/communities/search?query=${encodeURIComponent(query)}`),
            ]);

            const users = (usersResponse.data.users || []).map((user: any) => ({
                ...user,
                entityType: 'user',
            }));
            const communities = (communitiesResponse.data.communities || []).map((community: any) => ({
                ...community,
                entityType: 'community',
            }));

            return [...users, ...communities];
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
        updateUserRelation: (state, action) => {
            const { userId, relation } = action.payload;
            const user = state.searchResults.find(u => u.entityType !== 'community' && u.id === userId);
            if (user) {
                user.relation = {
                    ...(user.relation || {}),
                    ...relation,
                };
            }
        },
        updateUserFollowStatus: (state, action) => {
            const { userId, isFollowing } = action.payload;
            const user = state.searchResults.find(u => u.entityType !== 'community' && u.id === userId);
            if (user) {
                user.isFollowing = isFollowing;
            }
        },
        updateCommunitySubscription: (state, action) => {
            const { communityId, changes } = action.payload;
            const community = state.searchResults.find(item =>
                item.entityType === 'community' && item.id === communityId
            );
            if (community) {
                Object.assign(community, changes);
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
                const user = state.searchResults.find(u => u.entityType !== 'community' && u.id === userId);
                if (user) {
                    user.isFollowing = true;
                }
            })
            // Unfollow user - ОБНОВЛЯЕМ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ
            .addCase(unfollowUser.fulfilled, (state, action) => {
                const userId = action.payload;
                const user = state.searchResults.find(u => u.entityType !== 'community' && u.id === userId);
                if (user) {
                    user.isFollowing = false;
                }
            });
    },
});

export const {
    clearSearch,
    updateUserRelation,
    updateUserFollowStatus,
    updateCommunitySubscription
} = usersSlice.actions;
export default usersSlice.reducer;
