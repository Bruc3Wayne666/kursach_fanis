import { createSlice } from '@reduxjs/toolkit';
import { storageHelper } from '../../utils/storage.ts';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: storageHelper.getToken() || null,
        isLoading: true,
        error: null as string | null,
    },
    reducers: {
        login: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.error = null;
            state.isLoading = false;
            storageHelper.setToken(action.payload.token);
            storageHelper.setUser(action.payload.user);
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.error = null;
            state.isLoading = false;
            storageHelper.clearAuth();
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
            state.isLoading = false;
        },
        clearError: (state) => {
            state.error = null;
        },
        // store/slices/authSlice.js - ОБНОВЛЯЕМ updateProfile
        updateProfile: (state, action) => {
            if (state.user) {
                state.user = {
                    ...state.user,
                    ...action.payload
                };
                storageHelper.setUser(state.user);
            }
        },
    },
});

export const { login, logout, setLoading, setError, clearError, updateProfile } = authSlice.actions;
export default authSlice.reducer;
