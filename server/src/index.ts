// server/src/index.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import youtubeApi from "@/apis/youtubeRequest";
import {
  ChannelSearchResult,
  ChannelDetailResult,
  ErrorResponse,
  YouTubeChannelItem,
  YouTubeChannelDetail,
  UserDetailRequest,
  UserDetailResponse,
} from "@/types";
import {
  getChannelDetail,
  getVideoDetail,
  getVideoList,
} from "@/apis/youtubeApi";
import { extractEmails, findEmails } from "@/utils/tool";
import { taskManager } from "@/utils/TaskManager";

const app = express();
const PORT = process.env.PORT || 5432;

// 配置CORS - 允许前端访问
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());

const APIKEY = process.env.YOUTUBE_API_KEY;

// 🔍 搜索频道（博主）
app.get(
  "/api/search/video",
  async (
    req: Request<{
      q: string;
      type: string;
      current: string;
      pageSize: string;
    }>,
    res: Response<any>
  ) => {
    const { q, type, current, pageSize } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "请提供字符串类型的搜索关键词 q" });
    }

    try {
      const data = await getVideoList({
        q: q || "",
      });
      const videoIds: { channelId: string; videoId: string }[] = data.items
        .filter((item: any) => item.id?.videoId)
        .map((item: YouTubeChannelItem) => ({
          channelId: item.snippet.channelId,
          videoId: item.id.videoId,
        }));

      const videoDetails = await Promise.all(
        videoIds.map((item) => getVideoDetail(item.videoId))
      );

      const videos = videoDetails.map((item) => {
        const video = item.items[0];
        return {
          channelId: video.snippet.channelId,
          publishedAt: video.snippet.publishedAt,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnailUrl: video.snippet.thumbnails.default.url,
          channelTitle: video.snippet.channelTitle,
          viewCount: video.statistics.viewCount,
          likeCount: video.statistics.likeCount,
          commentCount: video.statistics.commentCount,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
        };
      });

      return res.json({
        data: videos,
      });

      // const uniqueChannels = Array.from(
      //   new Map(
      //     channels.map(item => [item.channelId, item])
      //   ).values()
      // );

      // const channelDetails = await Promise.all(uniqueChannels.map(item => getChannelDetail(item.channelId)));

      // const emailChannels: any[] = [];

      // const filteredChannelDetails = channelDetails.map((channel: any) => {
      //   const { items } = channel;
      //   if (!items || items.length === 0) return null;

      //   const item = items[0];
      //   return {
      //     snippet: item.snippet,
      //     statistics: item.statistics,
      //     brandingSettings: {
      //       ...item.brandingSettings?.channel
      //     }
      //   };
      // }).filter(Boolean).map((item: any) => {
      //   const emails = findEmails([item?.snippet?.description, item?.snippet?.localized?.description || '', item?.brandingSettings?.description]);
      //   const format ={
      //     title: item?.snippet.title,
      //     description: item?.snippet.description,
      //     customUrl: item?.snippet.customUrl,
      //     email: emails,
      //     keywords: item?.brandingSettings.keywords,
      //     ...item?.statistics,
      //   }
      //   if (emails.length > 0) {
      //     emailChannels.push(format);
      //   }
      //   return format;
      // });

      // 只返回有邮箱的相关数据
      // if (type === '1') {
      //   res.json({
      //     results: emailChannels,
      //     count: emailChannels.length,
      //     total: data.pageInfo?.totalResults,
      //     query: q,
      //   });
      // } else if (type === '2') {
      //   res.json({
      //     query: q,
      //     total: data.pageInfo?.totalResults || 0,
      //     results: filteredChannelDetails,
      //     count: emailChannels.length,
      //   });
      // } else {
      //   res.json({
      //     query: q,
      //     origin: channels,
      //     totalResults: data.pageInfo?.totalResults || 0,
      //     results: uniqueChannels,
      //     details: filteredChannelDetails,
      //     channelDetails: channelDetails,
      //     emailCount: emailChannels.length,
      //     emailChannels: emailChannels
      //   });
      // }
    } catch (err: any) {
      console.error("❌ YouTube API 搜索失败:", err.message);
      res.status(500).json({ error: "搜索失败：" + err.message });
    }
  }
);

/**
 * 获取用户详情
 * params: { q: string, type: '1' | '2', count: number }
 * 1. 根据查询参数 q 获取视频列表
 * 2. 根据视频列表过滤获取channelId, 需要去重
 * 3. 根据channelId获取频道详情，根据type 为 1 过滤有邮箱的channel，2的话全部返回，筛选邮箱使用：findEmails([item?.snippet?.description, item?.snippet?.localized?.description || '', item?.brandingSettings?.description])
 * 4. 返回count的条数，如果没到，则需要使用第一步请求返回的nextpagetoken拿下一页的数据在进行重新请求，直到达到count的条数
 * 5. 希望可以进行异步操作，不要阻塞主线程，用户进行轮询，每次返回最新结果，并且返回百分比，已有的count / count * 100
 * 6. 可以停止任务，返回之前的数据
 */

/**
 * 启动用户详情获取任务
 * POST /api/user-details/start
 * Body: { q: string, type: '1' | '2', count: number }
 */
app.post(
  "/api/user-details/start",
  async (req: Request, res: Response<UserDetailResponse | ErrorResponse>) => {
    try {
      const { q, type, count }: UserDetailRequest = req.body;

      console.log(req.body)
      // 参数验证
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "请提供搜索关键词 q" });
      }

      if (!type || (type !== '1' && type !== '2')) {
        return res.status(400).json({ error: "请提供有效的类型参数 (1: 仅有邮箱, 2: 所有频道)" });
      }

      if (!count || typeof count !== 'number' || count <= 0) {
        return res.status(400).json({ error: "请提供有效的数量参数 count (> 0)" });
      }

      if (count > 5000) {
        return res.status(400).json({ error: "单次任务最大支持5000条数据" });
      }

      // 检查是否有过多活跃任务
      if (taskManager.getActiveTasksCount() >= 10) {
        return res.status(429).json({ error: "系统繁忙，请稍后再试" });
      }

      // 创建任务
      const taskId = taskManager.createTask(q, type, count);
      const task = taskManager.getTask(taskId);

      if (!task) {
        return res.status(500).json({ error: "任务创建失败" });
      }

      const response: UserDetailResponse = {
        taskId,
        status: 'started',
        progress: task.progress,
        currentCount: task.currentCount,
        totalFound: task.totalFound,
        results: task.results,
      };

      res.json(response);
      
      console.log(`✅ 任务已启动: ${taskId}, 查询: "${q}", 类型: ${type}, 目标: ${count}`);
      
    } catch (error: any) {
      console.error("❌ 启动任务失败:", error.message);
      taskManager.forceClearAllTasks();
      res.status(500).json({ error: "启动任务失败：" + error.message });
    }
  }
);

/**
 * 查询任务状态和结果
 * GET /api/user-details/status/:taskId
 */
app.get(
  "/api/user-details/status/:taskId",
  async (req: Request, res: Response<UserDetailResponse | ErrorResponse>) => {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return res.status(400).json({ error: "请提供任务ID" });
      }

      const task = taskManager.getTask(taskId);

      if (!task) {
        return res.status(404).json({ error: "任务不存在或已过期" });
      }

      const response: UserDetailResponse = {
        taskId: task.taskId,
        status: task.status,
        progress: task.progress,
        currentCount: task.currentCount,
        totalFound: task.totalFound,
        results: task.results,
        error: task.error,
      };

      res.json(response);
      
    } catch (error: any) {
      console.error("❌ 查询任务状态失败:", error.message);
      res.status(500).json({ error: "查询任务状态失败：" + error.message });
    }
  }
);

/**
 * 停止任务
 * DELETE /api/user-details/stop/:taskId
 */
app.delete(
  "/api/user-details/stop/:taskId",
  async (req: Request, res: Response<UserDetailResponse | ErrorResponse>) => {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return res.status(400).json({ error: "请提供任务ID" });
      }

      const success = taskManager.stopTask(taskId);

      if (!success) {
        return res.status(404).json({ error: "任务不存在或无法停止" });
      }

      const task = taskManager.getTask(taskId);

      if (!task) {
        return res.status(404).json({ error: "任务不存在" });
      }

      const response: UserDetailResponse = {
        taskId: task.taskId,
        status: task.status,
        progress: task.progress,
        currentCount: task.currentCount,
        totalFound: task.totalFound,
        results: task.results,
        error: task.error,
      };

      res.json(response);
      
      console.log(`⏹️  任务已停止: ${taskId}`);
      
    } catch (error: any) {
      console.error("❌ 停止任务失败:", error.message);
      res.status(500).json({ error: "停止任务失败：" + error.message });
    }
  }
);

/**
 * 获取任务管理器统计信息 (调试用)
 * GET /api/user-details/stats
 */
app.get("/api/user-details/stats", (req: Request, res: Response) => {
  const stats = taskManager.getTasksStats();
  res.json({
    message: "任务管理器统计信息",
    ...stats,
    timestamp: new Date().toISOString(),
  });
});

// 健康检查端点
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "YouTube搜索服务运行正常" });
});

app.listen(PORT, () => {
  console.log(`✅ YouTube搜索后端服务已启动：http://localhost:${PORT}`);
  console.log(`🔍 API文档：http://localhost:${PORT}/api/health`);
});
