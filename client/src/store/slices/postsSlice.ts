// src/store/slices/postsSlice.ts - ОБНОВЛЕННАЯ ВЕРСИЯ
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { login, logout } from './authSlice';

// Async actions
export const fetchPosts = createAsyncThunk(
    'posts/fetchPosts',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/posts/feed');
            return response.data.posts;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch posts');
        }
    }
);

// 🔥 ДОБАВЛЯЕМ ДЛЯ ПРОФИЛЕЙ
export const fetchUserPosts = createAsyncThunk(
    'posts/fetchUserPosts',
    async (userId: string, { rejectWithValue }) => {
        try {
            const response = await api.get(`/posts/user/${userId}?limit=50`);
            return { userId, posts: response.data.posts };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch user posts');
        }
    }
);

export const createPost = createAsyncThunk(
    'posts/createPost',
    async (postData: { content: string, image?: string }, { rejectWithValue }) => {
        try {
            const response = await api.post('/posts', postData);
            return response.data.post;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to create post');
        }
    }
);




// В postsSlice.ts заменяем likePost и unlikePost на один:
export const toggleLikeAction = createAsyncThunk(
    'posts/toggleLike',
    async (postId: string, { rejectWithValue }) => {
        try {
            // Шлем всегда POST на наш новый эндпоинт
            const response = await api.post(`/posts/${postId}/toggle-like`);

            // Сервер вернет нам { isLiked: true/false, likesCount: число }
            return {
                postId,
                isLiked: response.data.isLiked,
                likesCount: response.data.likesCount
            };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Like failed');
        }
    }
);

interface Post {
    id: string;
    content: string;
    image?: string;
    likesCount: number;
    isLiked: boolean;
    author: string;
    createdAt: string;
    commentsCount?: number;
}

interface PostsState {
    posts: Post[];
    userPosts: { [key: string]: Post[] };
    loading: boolean;
    error: string | null;
}

const initialState: PostsState = {
    posts: [],
    userPosts: {},
    loading: false,
    error: null,
};

const postsSlice = createSlice({
    name: 'posts',
    initialState,
    reducers: {
        // 🔥 ДОБАВЛЯЕМ ДЛЯ ОЧИСТКИ ПРОФИЛЕЙ
        clearUserPosts: (state, action) => {
            const userId = action.payload;
            if (state.userPosts[userId]) {
                delete state.userPosts[userId];
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login, (state) => {
                state.posts = [];
                state.userPosts = {};
                state.loading = false;
                state.error = null;
            })
            .addCase(logout, (state) => {
                state.posts = [];
                state.userPosts = {};
                state.loading = false;
                state.error = null;
            })
            // Feed posts
            .addCase(fetchPosts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPosts.fulfilled, (state, action) => {
                state.loading = false;
                state.posts = action.payload;
            })
            .addCase(fetchPosts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // 🔥 USER POSTS
            .addCase(fetchUserPosts.fulfilled, (state, action) => {
                const { userId, posts } = action.payload;
                state.userPosts[userId] = posts;
            })
            .addCase(createPost.fulfilled, (state, action) => {
                state.posts.unshift(action.payload);
            })
            // .addCase(toggleLikeAction.fulfilled, (state, action) => {
            //     const { postId, isLiked, likesCount } = action.payload;
            //
            //     // 1. Обновляем в основной ленте
            //     const feedPost = state.posts.find(p => p.id === postId);
            //     if (feedPost) {
            //         feedPost.likesCount = likesCount;
            //         feedPost.isLiked = isLiked;
            //     }
            //
            //     // 2. Обновляем во всех загруженных профилях
            //     Object.keys(state.userPosts).forEach(userId => {
            //         const userPost = state.userPosts[userId].find(p => p.id === postId);
            //         if (userPost) {
            //             userPost.likesCount = likesCount;
            //             userPost.isLiked = isLiked;
            //         }
            //     });
            // });
            .addCase(toggleLikeAction.fulfilled, (state, action) => {
                const { postId, isLiked, likesCount } = action.payload;

                // 1. Обновляем ленту (то, что у тебя работает)
                const feedPost = state.posts.find(p => String(p.id) === String(postId));
                if (feedPost) {
                    feedPost.isLiked = isLiked;
                    feedPost.likesCount = likesCount;
                }

                // 2. Обновляем профили (то, где у тебя undefined)
                Object.keys(state.userPosts).forEach(uid => {
                    // Обязательно используем map, чтобы создать новую ссылку на массив
                    state.userPosts[uid] = state.userPosts[uid].map(p => {
                        if (String(p.id) === String(postId)) { // Приводим к String для надежности
                            return { ...p, isLiked, likesCount };
                        }
                        return p;
                    });
                });
            })
    },
});

export const {  clearUserPosts } = postsSlice.actions;
export default postsSlice.reducer;
