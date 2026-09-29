import { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, create as createAxios } from 'axios';
import { env } from '../../core/config/env';
import { secureStorage } from '../storage/secureStorage';

const DEFAULT_TIMEOUT = 15000;

const getAuthToken = async (): Promise<string | null> => {
  const session = await secureStorage.get<{ accessToken?: string }>('session');
  return session?.accessToken ?? null;
};

const apiClient: AxiosInstance = createAxios({
  baseURL: env.apiUrl,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await secureStorage.remove('session');
    }

    return Promise.reject(error);
  },
);

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => apiClient.get<T>(url, config),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => apiClient.post<T>(url, data, config),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => apiClient.put<T>(url, data, config),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => apiClient.patch<T>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) => apiClient.delete<T>(url, config),
};

export default apiClient;
