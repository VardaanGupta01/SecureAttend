import axios from 'axios';

// Read API URL from .env (Vite loads .env in development and .env.production in build)
const rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api')
  .trim()
  .replace(/\/+$/, '');

// Ensure /api suffix is always present
export const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
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
