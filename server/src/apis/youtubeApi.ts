import { it } from 'node:test';
import youtubeApi from './youtubeRequest';
import { VideoResponse } from '@/types';

const ytsearch = require('yt-search')

const APIKEY = process.env.YOUTUBE_API_KEY;

export const getVideoListByYtsearch = async (params: { q: string, type?: string, maxResults?: number, pageToken?: string }): Promise<VideoResponse> => {
  const { q, type, maxResults, pageToken } = params;
  const response = await ytsearch({ query: q, type: 'channel'});
  console.log(response)
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

export const getVideoDetail = async (videoId: string) => {
  const response = await youtubeApi.get('/videos', {
    params: {
      part: 'snippet,statistics',
      id: videoId,
      key: APIKEY,
    },
  });

  return response.data;
}
