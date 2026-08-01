import axios from 'axios';

const isLocal =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocal ? 'http://localhost:8080/api' : 'https://oom-project-1.onrender.com/api');

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
