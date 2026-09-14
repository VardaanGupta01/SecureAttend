import axios from 'axios';

const isLocal =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocal ? 'http://localhost:8080/api' : 'https://oom-project-1.onrender.com/api');

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000, // Render free tier can take ~60s to wake up
});

api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
  } catch {
    // ignore
  }
  return config;
});

export default api;
