import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('mpds_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401, auto-refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !(originalRequest as any)._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('mpds_refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('mpds_token');
        localStorage.removeItem('mpds_refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { token, refreshToken: newRefreshToken } = data.data;
        localStorage.setItem('mpds_token', token);
        localStorage.setItem('mpds_refresh_token', newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        processQueue(null);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem('mpds_token');
        localStorage.removeItem('mpds_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    return Promise.reject(error);
  }
);

// Typed response wrapper
export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const response = await api.get<{ data: T }>(url, { params });
  return response.data.data;
}

export async function apiPost<T>(url: string, data?: unknown) {
  const response = await api.post<{ data: T }>(url, data);
  return response.data.data;
}

export async function apiPut<T>(url: string, data?: unknown) {
  const response = await api.put<{ data: T }>(url, data);
  return response.data.data;
}

export async function apiPatch<T>(url: string, data?: unknown) {
  const response = await api.patch<{ data: T }>(url, data);
  return response.data.data;
}

export async function apiDelete<T>(url: string) {
  const response = await api.delete<{ data: T }>(url);
  return response.data.data;
}

export async function apiUpload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void) {
  const response = await api.post<{ data: T }>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    },
  });
  return response.data.data;
}

export default api;
