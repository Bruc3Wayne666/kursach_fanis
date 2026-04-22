import axios from 'axios';
import { storageHelper } from '../utils/storage.ts';

export const api = axios.create({
    // baseURL: 'http://localhost:5000/api',
    baseURL: 'http://192.168.0.116:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = storageHelper.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
