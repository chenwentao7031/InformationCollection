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
