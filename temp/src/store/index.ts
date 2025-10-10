import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import postsReducer from './slices/postsSlice';
import messagesReducer from './slices/messagesSlice';
import usersReducer from './slices/usersSlice'; // Добавляем

export const store = configureStore({
    reducer: {
        auth: authReducer,
        posts: postsReducer,
        messages: messagesReducer,
        users: usersReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
