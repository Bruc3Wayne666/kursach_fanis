import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

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

// 🔥 ДОБАВЛЯЕМ createPost
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

export const likePost = createAsyncThunk(
    'posts/likePost',
    async (postId: string, { rejectWithValue }) => {
        try {
            const response = await api.post(`/posts/${postId}/like`);
            return { postId, likesCount: response.data.likesCount };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Like failed');
        }
    }
);

export const unlikePost = createAsyncThunk(
    'posts/unlikePost',
    async (postId: string, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/posts/${postId}/like`);
            return { postId, likesCount: response.data.likesCount };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Unlike failed');
        }
    }
);

const postsSlice = createSlice({
    name: 'posts',
    initialState: {
        posts: [],
        loading: false,
        error: null as string | null,
    },
    reducers: {
        setPosts: (state, action) => {
            state.posts = action.payload;
        },
        addPost: (state, action) => {
            state.posts.unshift(action.payload);
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        toggleLike: (state, action) => {
            const postId = action.payload;
            const post = state.posts.find(p => p.id === postId);
            if (post) {
                const isLiked = !post.isLiked;
                post.isLiked = isLiked;
                post.likesCount = isLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1);
            }
        },
    },
    extraReducers: (builder) => {
        builder
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
            // 🔥 ДОБАВЛЯЕМ ОБРАБОТКУ createPost
            .addCase(createPost.fulfilled, (state, action) => {
                state.posts.unshift(action.payload);
            })
            .addCase(likePost.fulfilled, (state, action) => {
                const { postId, likesCount } = action.payload;
                const post = state.posts.find(p => p.id === postId);
                if (post) {
                    post.likesCount = likesCount;
                    post.isLiked = true;
                }
            })
            .addCase(unlikePost.fulfilled, (state, action) => {
                const { postId, likesCount } = action.payload;
                const post = state.posts.find(p => p.id === postId);
                if (post) {
                    post.likesCount = likesCount;
                    post.isLiked = false;
                }
            });
    },
});

export const { setPosts, addPost, setLoading, clearError, toggleLike } = postsSlice.actions;
export default postsSlice.reducer;
