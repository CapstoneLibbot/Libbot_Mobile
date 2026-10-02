import {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  create as createAxios,
} from "axios";
import { runtimeConfig } from "@/core/config";
import { secureStorage } from "../storage/secureStorage";

const DEFAULT_TIMEOUT = 15000;

const getKioskToken = async (): Promise<string | null> => {
  const token = await secureStorage.get<string>("kiosk_token");
  return token;
};

export const apiClient: AxiosInstance = createAxios({
  baseURL: runtimeConfig.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getKioskToken();
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
    return Promise.reject(error);
  },
);

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config),
};

export default apiClient;
