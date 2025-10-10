// src/utils/storage.ts - ДОБАВЛЯЕМ getUser
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export const storageHelper = {
    getToken: (): string | null => {
        return storage.getString('userToken') || null;
    },
    setToken: (token: string) => {
        storage.set('userToken', token);
    },
    removeToken: () => {
        storage.delete('userToken');
    },
    getUser: () => {
        const user = storage.getString('user');
        return user ? JSON.parse(user) : null;
    },
    setUser: (user: any) => {
        storage.set('user', JSON.stringify(user));
    },
    clearAuth: () => {
        storage.delete('userToken');
        storage.delete('user');
    }
};
