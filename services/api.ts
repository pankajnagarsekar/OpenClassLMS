import axios, { AxiosInstance } from 'axios';

// Use relative path to leverage Vite's proxy in vite.config.ts
// This forwards requests from localhost:5173/api -> localhost:5000
// It fixes "Network Error" by preventing direct cross-origin requests in dev mode
const API_URL = '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;