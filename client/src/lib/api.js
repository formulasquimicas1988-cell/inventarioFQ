import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
});

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;

    // Server down or unreachable
    if (!err.response || status === 502 || status === 503 || status === 504) {
      return Promise.reject(new Error('El servidor no está disponible. Verifica que el backend esté corriendo.'));
    }

    // Conflict / validation errors — pass server message through
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido';
    return Promise.reject(new Error(msg));
  }
);

export default api;
