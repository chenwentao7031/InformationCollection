import youtubeApi from './youtubeRequest';

const APIKEY = process.env.YOUTUBE_API_KEY;

export const getVideoList = async (params: { q: string, type?: string, maxResults?: number, pageToken?: string }) => {
  const { q, type, maxResults, pageToken } = params;
  const response = await youtubeApi.get('/search', {
    params: {
      part: 'snippet',
      q: q,
      type: 'video',
      maxResults: maxResults || 20,
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
