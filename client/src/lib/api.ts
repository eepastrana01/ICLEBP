import axios from 'axios';

// La URL base del API. Detecta automáticamente el host (localhost o IP de red local para teléfonos)
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = token;
  }
  return config;
});

// Interceptor para manejar errores globales de API (ej. Token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (error.response.data?.error === 'Token inválido o expirado') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth_error')); // Custom event for the App to logout
      }
    } else if (error.response?.status === 403) {
      if (error.response.data?.error === 'Acceso denegado: Se requiere Token') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth_error'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
