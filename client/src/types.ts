// client/src/types.ts

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

export interface SearchResponse {
  query: string;
  totalResults?: number;
  results: ChannelData[];
  count: number;
  emailChannels?: ChannelData[];
  emailCount?: number;
}

export interface ChannelData {
  title: string;
  description: string;
  customUrl?: string;
  email: string[];
  keywords?: string;
  subscriberCount: string;
  viewCount: string;
  videoCount: string;
}

export interface ErrorResponse {
  error: string;
}
