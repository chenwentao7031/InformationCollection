// client/src/services/api.ts
import axios from 'axios';
import { useRequest } from 'ahooks';
import { message } from 'antd';
import { SearchResponse, ChannelDetailResult } from '@/types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5432';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const defaultOptions = {
  manual: true,
  onSuccess: () => {
    message.success('请求成功');
  },
  onError: (error: any) => {
    message.error(`请求失败：${error.message}`);
  },
};

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

// useRequest 专用的服务函数
export const searchChannelsService = async (query: string): Promise<SearchResponse> => {
  const response = await api.get('/api/search/video', {
    params: {
      q: query
    }
  });
  return response.data;
};

export const getChannelDetailService = async (channelId: string): Promise<ChannelDetailResult> => {
  const response = await api.get(`/api/channel/${channelId}`);
  return response.data;
};

export const healthCheckService = async (): Promise<{ status: string; message: string }> => {
  const response = await api.get('/api/health');
  return response.data;
};

// 开启查询用户获取taskId
export const startUserDetailService = async (query: string, type: string, count: number): Promise<any> => {
  const response = await api.post('/api/user-details/start', {
    q: query,
    type: type,
    count: count
  });
  return response.data;
};

// 轮询用户信息列表
export const pollUserDetailService = async (taskId: string): Promise<any> => {
  const response = await api.get(`/api/user-details/status/${taskId}`);
  return response.data;
};

// 停止用户详情获取任务
export const stopUserDetailService = async (taskId: string): Promise<any> => {
  const response = await api.delete(`/api/user-details/stop/${taskId}`);
  return response.data;
};

/**
 * YouTube 搜索 Hook
 * 封装了 useRequest，提供搜索功能
 */
export const useSearchChannels = () => {
  return useRequest(
    searchChannelsService,
    defaultOptions
  );
};

/**
 * 频道详情获取 Hook
 * 封装了 useRequest，提供频道详情获取功能
 */
export const useChannelDetail = () => {
  return useRequest(
    getChannelDetailService,
    defaultOptions
  );
};

/**
 * 健康检查 Hook
 * 封装了 useRequest，提供健康检查功能
 */
export const useHealthCheck = () => {
  return useRequest(
    healthCheckService,
    defaultOptions
  );
};

export const useStartUserDetails = () => {
  return useRequest(
    startUserDetailService,
    {
      ...defaultOptions,
      onSuccess: () => {
        message.success('任务已启动，正在获取数据...');
      },
    }
  );
};

export const usePollUserDetails = () => {
  return useRequest(
    pollUserDetailService,
    {
      manual: true,
      onError: (error: any) => {
        console.error('轮询失败:', error);
      },
    }
  );
};

export const useStopUserDetails = () => {
  return useRequest(
    stopUserDetailService,
    {
      manual: true,
      onSuccess: () => {
        message.success('任务已停止');
      },
      onError: (error: any) => {
        message.error(`停止任务失败：${error.message}`);
      },
    }
  );
};

export default api;
