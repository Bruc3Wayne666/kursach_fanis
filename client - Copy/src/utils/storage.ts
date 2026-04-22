import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

// Хелперы для удобства
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
};
