// store/index.ts - ПРОВЕРЯЕМ
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import postsReducer from './slices/postsSlice';
import messagesReducer from './slices/messagesSlice';
import usersReducer from './slices/usersSlice';
import conversationsReducer from './slices/conversationsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        posts: postsReducer,
        messages: messagesReducer,
        users: usersReducer,
        conversations: conversationsReducer, // ✅ ДОЛЖЕН БЫТЬ ДОБАВЛЕН
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
