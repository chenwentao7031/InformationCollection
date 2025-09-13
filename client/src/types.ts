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
  data: {
    channelId: string;
    publishedAt: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    channelTitle: string;
    viewCount: string;
    likeCount: string;
    commentCount: string;
    videoUrl: string;
  }[];
}

export interface ChannelData {
  title: string;
  description: string;
  customUrl?: string;
  email: string[];
  keywords?: string;
  country: string;
  subscriberCount: string;
  viewCount: string;
  videoCount: string;
}

export interface ErrorResponse {
  error: string;
}

// YouTube视频数据接口
export interface VideoData {
  channelId: string;
  publishedAt: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  videoUrl: string;
  key?: number;
}

// Instagram用户数据接口（预留）
export interface InstagramUserData {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  profilePictureUrl: string;
  followersCount: string;
  followingCount: string;
  postsCount: string;
  isVerified: boolean;
  externalUrl?: string;
  contactEmail?: string[];
}

// TikTok用户数据接口（预留）
export interface TikTokUserData {
  id: string;
  username: string;
  displayName: string;
  biography: string;
  avatarUrl: string;
  followersCount: string;
  followingCount: string;
  videosCount: string;
  likesCount: string;
  isVerified: boolean;
  contactEmail?: string[];
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

export interface UserDetailTaskResponse {
  taskId: string;
  status: 'started' | 'running' | 'completed' | 'stopped' | 'error';
  progress: number;
  currentCount: number;
  totalFound: number;
  results: ChannelWithEmails[];
  error?: string;
}

export interface YtsearchRequest {
  q: string;
}

export interface YtsearchVideo {
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
  ago: string;
  views: number;
  author: {
    name: string;
    url: string;
  };
}

export interface YtsearchResponse {
  data: YtsearchVideo[];
}

export interface UserDetailResponse {
  results: ChannelWithEmails[];
  taskId: string,
  status: 'started' | 'running' | 'completed' | 'stopped' | 'error';
  progress: number,
  currentCount: number,
  totalFound: number,
  error: string,
}