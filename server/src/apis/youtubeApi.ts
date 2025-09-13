import { it } from 'node:test';
import youtubeApi from './youtubeRequest';
import { VideoResponse, YouTubeSearchResponse } from '@/types';

const ytsearch = require('yt-search')

const APIKEY = process.env.YOUTUBE_API_KEY;
export const YT_SEARCH_PAGESIZE = 20;

/**
 * pageStart 1, pageEnd 1 这样为1页数据，20条
 * @param params { q: string, type?: string, pageStart?: number 1 , pageEnd?: number 2 }
 * @returns 
 */
export const getVideoListByYtsearch = async (params: { q: string, type?: string, pageStart?: number, pageEnd?: number }): Promise<VideoResponse[]> => {
  const { q, type, pageStart, pageEnd } = params;
  const response = await ytsearch({ query: q, type: 'channel' });
  return response?.videos;
}

// 需要100配额, 消耗太大
export const getVideoList = async (params: { q: string, type?: string, maxResults?: number, pageToken?: string }) => {
  const { q, type, maxResults, pageToken } = params;
  const response = await youtubeApi.get('/search', {
    params: {
      part: 'snippet',
      q: q,
      type: 'video',
      maxResults: maxResults || 50,
      ...(pageToken && { pageToken: pageToken }),
      key: APIKEY,
    },
  });
  return response.data;
}

/**
 * forHandle，forUsername 无法同时使用，并且只能精确查找一个用户
 * @param channelIds 
 * @returns 
 */
export const getChannelDetail = async (channelIds: string[]) => {
  const response = await youtubeApi.get('/channels', {
    params: {
      part: 'snippet,statistics,brandingSettings',
      id: channelIds.join(','),
      key: APIKEY,
    },
  });

  return response.data;
}

export const getVideoDetail = async (videoIds: string[]): Promise<YouTubeSearchResponse> => {
  const response = await youtubeApi.get('/videos', {
    params: {
      part: 'snippet,statistics',
      id: videoIds.join(','),
      key: APIKEY,
    },
  });

  return response.data;
}
