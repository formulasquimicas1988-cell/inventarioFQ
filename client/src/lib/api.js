import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Interceptor para errores
api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || err.message || 'Error de conexión';
    return Promise.reject(new Error(msg));
  }
);

export default api;
