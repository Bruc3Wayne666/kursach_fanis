import { storageHelper } from '../utils/storage.ts';
import { api } from '../services/api';
import { login, setLoading, setError } from "../store/slices/authSlice.ts";

export const checkAuth = async (dispatch: any) => {
    const token = storageHelper.getToken();

    if (token) {
        try {
            const response = await api.get('/auth/me');
            dispatch(login({
                user: response.data.user,
                token: token,
            }));
        } catch (error: any) {
            console.log('❌ Токен невалидный:', error);
            storageHelper.removeToken();
            dispatch(setError('Сессия истекла. Войдите снова.'));
        }
    }

    dispatch(setLoading(false));
};
