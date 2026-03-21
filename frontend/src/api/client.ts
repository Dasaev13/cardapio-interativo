import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logging em desenvolvimento
if (import.meta.env.DEV) {
  apiClient.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });
}

// Interceptor para erros globais
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      const msg = error.response.data.error.message;
      return Promise.reject(new Error(msg));
    }
    return Promise.reject(error);
  }
);

export function setAuthToken(token: string): void {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
