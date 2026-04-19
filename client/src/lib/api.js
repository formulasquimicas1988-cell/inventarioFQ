import axios from 'axios';

const STORAGE_KEY = 'fq_sesion';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
});

// Adjuntar token JWT a cada request
api.interceptors.request.use(config => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const sesion = raw ? JSON.parse(raw) : null;
    if (sesion?.token) {
      config.headers['Authorization'] = `Bearer ${sesion.token}`;
    }
  } catch {
    // localStorage no disponible
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;

    // Sesión expirada — solo redirigir si el usuario tenía un token activo
    if (status === 401) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const sesion = raw ? JSON.parse(raw) : null;
        if (sesion?.token) {
          localStorage.removeItem(STORAGE_KEY);
          window.location.href = '/';
        }
      } catch {
        // ignorar error de localStorage
      }
      return Promise.reject(new Error('Sesión expirada. Por favor inicia sesión nuevamente.'));
    }

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
