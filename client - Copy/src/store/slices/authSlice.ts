import { createSlice } from '@reduxjs/toolkit';
import { storageHelper } from '../../utils/storage.ts';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: storageHelper.getToken() || null,
        isLoading: true,
        error: null as string | null, // Добавляем обработку ошибок
    },
    reducers: {
        login: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.error = null; // Очищаем ошибку при успешном логине
            storageHelper.setToken(action.payload.token);
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.error = null;
            storageHelper.removeToken();
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        setError: (state, action) => { // Новый action для ошибок
            state.error = action.payload;
            state.isLoading = false;
        },
        clearError: (state) => { // Очистка ошибки
            state.error = null;
        },
        updateProfile: (state, action) => {
            if (state.user) {
                state.user = {
                    ...state.user,
                    ...action.payload
                };
            }
        },
    },
});

export const { login, logout, setLoading, setError, clearError, updateProfile } = authSlice.actions;
export default authSlice.reducer;
