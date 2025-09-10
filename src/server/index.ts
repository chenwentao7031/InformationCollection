// src/server.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import youtubeApi from '@/utils/http';
import {
  ChannelSearchResult,
  ChannelDetailResult,
  ErrorResponse,
  YouTubeChannelItem,
  YouTubeChannelDetail,
} from '@/types';
import path from 'path';
import { getChannelDetail } from '@/utils/youtube';
import { extractEmails, findEmails } from '@/utils/tool';

const app = express();
const PORT = process.env.PORT || 3000;
// 获取正确的静态文件路径
const staticPath = path.resolve(__dirname, '../public');

app.use(cors());
app.use(express.json());
app.use(express.static(staticPath));
const APIKEY = process.env.YOUTUBE_API_KEY;

// 🔍 搜索频道（博主）
app.get('/api/search/video', async (req: Request, res: Response<any>) => {
  const { q, type, current, pageSize } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: '请提供字符串类型的搜索关键词 q' });
  }

  try {
    const response = await youtubeApi.get('/search', {
      params: {
        part: 'snippet',
        q: q,
        type: 'video',
        key: APIKEY,
        maxResults: 50,
      },
    });

    const data = response.data;

    const channels: ChannelSearchResult[] = data.items
      .filter((item: any) => item.id?.videoId)
      .map((item: YouTubeChannelItem) => ({
        channelId: item.snippet.channelId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
      }))

    const uniqueChannels = Array.from(
      new Map(
        channels.map(item => [item.channelId, item])
      ).values()
    );

    const channelDetails = await Promise.all(uniqueChannels.map(item => getChannelDetail(item.channelId)));

    const emailChannels: any[] = [];

    const filteredChannelDetails = channelDetails.map(channel => {
      const { items } = channel;
      if (!items || items.length === 0) return null;

      const item = items[0];
      return {
        snippet: item.snippet,
        statistics: item.statistics,
        brandingSettings: {
          ...item.brandingSettings.channel
        }
      };
    }).filter(Boolean).map(item => {
      const emails = findEmails([item?.snippet?.description, item?.snippet?.localized?.description || '', item?.brandingSettings?.description]);
      const format ={
        title: item?.snippet.title,
        description: item?.snippet.description,
        customUrl: item?.snippet.customUrl,
        email: emails,
        keywords: item?.brandingSettings.keywords,
        ...item?.statistics,
      }
      if (emails.length > 0) {
        emailChannels.push(format);
      }
      return format;
    });

    // 只返回有邮箱的相关数据
    if (type === '1') {
      res.json({
        results: emailChannels,
        count: emailChannels.length,
        total: data.pageInfo?.totalResults,
        query: q,
      });
    } else if (type === '2') {
      res.json({
        query: q,
        total: data.pageInfo?.totalResults || 0,
        results: filteredChannelDetails,
        count: emailChannels.length,
      });
    } else {
      res.json({
        query: q,
        totalResults: data.pageInfo?.totalResults || 0,
        results: uniqueChannels,
        details: filteredChannelDetails,
        channelDetails: channelDetails,
        emailCount: emailChannels.length,
        emailChannels: emailChannels
      });
    }
  } catch (err: any) {
    console.error('❌ YouTube API 搜索失败:', err.message);
    res.status(500).json({ error: '搜索失败：' + err.message });
  }
});

// 🧾 获取频道详情
app.get('/api/channel/:id', async (req: Request, res: Response<ChannelDetailResult | ErrorResponse>) => {
  const { id: channelId } = req.params;

  if (!channelId) {
    return res.status(400).json({ error: '请提供 channelId' });
  }

  try {
    const response = await youtubeApi.get('/channels', {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: APIKEY,
      },
    });

    const data = response.data;

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: '频道不存在' });
    }

    const channel: YouTubeChannelDetail = data.items[0];

    const result: ChannelDetailResult = {
      channelId: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      customUrl: channel.snippet.customUrl,
      subscribers: channel.statistics.subscriberCount,
      views: channel.statistics.viewCount,
      videos: channel.statistics.videoCount,
      thumbnail: channel.snippet.thumbnails.default.url,
    };

    res.json(result);

  } catch (err: any) {
    console.error('❌ 获取频道详情失败:', err.message);
    res.status(500).json({ error: '获取频道详情失败：' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ TypeScript + Axios 服务已启动：http://localhost:${PORT}`);
  console.log(`🔍 试试访问：http://localhost:${PORT}/api/search?q=美食博主`);
});