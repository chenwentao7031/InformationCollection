import youtubeApi from './youtubeRequest';

const APIKEY = process.env.YOUTUBE_API_KEY;

export const getVideoList = async ({ q, type }: { q: string, type: string }) => {
  const response = await youtubeApi.get('/search', {
    params: {
      part: 'snippet',
      q: q,
      type: type,
      maxResults: 20,
      key: APIKEY,
    },
  });
  return response.data;
}


export const getChannelDetail = async (channelId: string) => {
    const response = await youtubeApi.get('/channels', {
      params: {
        part: 'snippet,statistics,brandingSettings',
        id: channelId,
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
