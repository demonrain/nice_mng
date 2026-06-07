import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@nice-admin/shared';
import { useAuthStore } from '@/store/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

let isRefreshing = false;
let pendingQueue: ((token: string) => void)[] = [];

instance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    // 二进制响应（如文件）直接返回
    if (response.config.responseType === 'blob') return response.data;
    if (body && typeof body.code === 'number') {
      if (body.code === 0) return body.data;
      message.error(body.message || '请求失败');
      return Promise.reject(new Error(body.message));
    }
    return response.data;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 401 && !original._retry) {
      const auth = useAuthStore.getState();
      if (!auth.refreshToken) {
        auth.logout();
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push((token: string) => {
            original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
            resolve(instance(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const newToken = await auth.refresh();
        pendingQueue.forEach((cb) => cb(newToken));
        pendingQueue = [];
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return instance(original);
      } catch (e) {
        auth.logout();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    const msg = error.response?.data?.message || error.message || '网络错误';
    if (status !== 401) message.error(msg);
    return Promise.reject(error);
  },
);

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => instance.get<unknown, T>(url, config),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.post<unknown, T>(url, data, config),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.put<unknown, T>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) => instance.delete<unknown, T>(url, config),
};

export default instance;
