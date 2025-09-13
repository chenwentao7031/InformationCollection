// server/src/utils/http.ts
import logger from '@/utils/logger';
import axios, { AxiosError } from 'axios';

// 创建专用 YouTube API 客户端
const requestInstance = axios.create({
  baseURL: 'https://www.googleapis.com/youtube/v3',
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
  },
});

// 响应拦截器 —— 统一处理错误
requestInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {  
    if (error.response) {
      // 服务器返回了错误状态码（4xx, 5xx）
      const msg = error.response.data || error.message;

      logger.error('Youtube Data API Error', {
        message: error.message,
        stack: error.stack,
        context: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
          data: error.config?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
        }
      });

      return Promise.reject(new Error(`API Error ${error.response.status}: ${JSON.stringify(msg)}`));
    } else if (error.request) {
      // 请求已发出，但没收到响应（网络错误）
      return Promise.reject(new Error('Network Error: No response received'));
    } else {
      logger.error('AXIOS Error', {
        message: error.message,
        stack: error.stack,
        context: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
          data: error.config?.data,
        }
      });
      // 其他错误（配置错误等）
      return Promise.reject(new Error(`Request Setup Error: ${error.message}`));
    }
  }
);

export default requestInstance;
