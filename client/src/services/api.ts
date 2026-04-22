import axios from 'axios';
import { storageHelper } from '../utils/storage';
import {API_BASE_URL, API_FILE_URL} from "../utils/constants.ts";

export const api = axios.create({
    // baseURL: 'http://192.168.0.116:5000/api',
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = storageHelper.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
