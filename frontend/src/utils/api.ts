import axios from 'axios';
import { DEMO_MODE } from './demoMode';
import { installMockInterceptor } from './mockInterceptor';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// In demo mode, intercept all requests and return mock data
if (DEMO_MODE) {
  installMockInterceptor(api);
} else {
  // Attach access token from localStorage
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Auto-refresh on 401
  api.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const { data } = await axios.post('/api/auth/refresh', { refreshToken });
            localStorage.setItem('accessToken', data.token);
            original.headers.Authorization = `Bearer ${data.token}`;
            return api(original);
          } catch {
            localStorage.clear();
            window.location.href = '/login';
          }
        } else {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
}

export default api;
