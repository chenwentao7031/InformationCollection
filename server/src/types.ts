// server/src/types.ts

// YouTube Search API 返回结构（简化版）
export interface YouTubeChannelItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    publishedAt: string;
    channelTitle: string;
    channelId: string;
  };
}

export interface YouTubeSearchResponse {
  items: YouTubeChannelItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

// 频道详情类型
export interface YouTubeChannelDetail {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    localized?: {
      description?: string;
    };
    thumbnails: {
      default: { url: string };
    };
  };
  statistics: {
    subscriberCount: string; // YouTube API 返回字符串
    viewCount: string;
    videoCount: string;
  };
  brandingSettings?: {
    channel?: {
      description?: string;
      keywords?: string;
      country?: string;
    };
  };
}

export interface ChannelSearchResult {
  channelId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
}

export interface ChannelDetailResult {
  channelId: string;
  title: string;
  description: string;
  customUrl?: string;
  subscribers: string;
  views: string;
  videos: string;
  thumbnail: string;
}

// 错误响应
export interface ErrorResponse {
  error: string;
}

export interface YouTubeApiError {
  error: {
    code: number;
    message: string;
    errors: Array<{
      message: string;
      domain: string;
      reason: string;
    }>;
  };
}

// 用户详情获取相关类型
export interface ChannelWithEmails {
  channelId: string;
  title: string;
  description: string;
  customUrl?: string;
  subscribers: string;
  views: string;
  videos: string;
  thumbnail: string;
  emails: string[];
  keywords?: string;
  country?: string;
}

export interface UserDetailTask {
  taskId: string;
  query: string;
  type: '1' | '2'; // 1: 仅有邮箱的频道, 2: 所有频道
  count: number;
  status: 'running' | 'completed' | 'stopped' | 'error';
  progress: number; // 0-100
  currentCount: number;
  totalFound: number;
  results: ChannelWithEmails[];
  error?: string;
  startTime: number;
}

export interface UserDetailRequest {
  q: string;
  type: '1' | '2';
  count: number;
}

export interface UserDetailResponse {
  taskId: string;
  status: 'started' | 'running' | 'completed' | 'stopped' | 'error';
  progress: number;
  currentCount: number;
  totalFound: number;
  results: ChannelWithEmails[];
  error?: string;
}

export interface VideoResponse {
  type: string;
  videoId: string;
  url: string;
  title: string;
  description: string;
  image: string;
  thumbnail: string;
  seconds: number;
  timestamp: string;
  duration: {
    seconds: number;
    timestamp: string;
  };
  views: number;
  author: {
    name: string;
    url: string;
  };
}