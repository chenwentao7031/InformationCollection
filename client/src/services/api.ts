// client/src/services/api.ts
import axios from 'axios';
import { SearchResponse, ChannelDetailResult } from '@/types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('发送请求:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

export const searchChannels = async (
  query: string,
  type: string = '1',
  range: string = '50'
): Promise<SearchResponse> => {
  const response = await api.get('/api/search/video', {
    params: {
      q: query,
      type: type,
      range: range
    }
  });
  return response.data;
};

export const getChannelDetail = async (channelId: string): Promise<ChannelDetailResult> => {
  const response = await api.get(`/api/channel/${channelId}`);
  return response.data;
};

export const healthCheck = async (): Promise<{ status: string; message: string }> => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;
