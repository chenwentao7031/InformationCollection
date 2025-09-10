import youtubeApi from './http';

const APIKEY = process.env.YOUTUBE_API_KEY;

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