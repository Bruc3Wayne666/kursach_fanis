import axios from 'axios';
import { storageHelper } from '../utils/storage';

export const api = axios.create({
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
