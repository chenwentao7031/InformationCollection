import { Router, Request, Response } from "express";
import { taskManager } from "@/utils/TaskManager";
import { getVideoList, getVideoListByYtsearch } from "@/apis/youtubeApi";
import { YouTubeChannelItem } from "@/types";
import { getVideoDetail } from "@/apis/youtubeApi";
import { UserDetailResponse, ErrorResponse, UserDetailRequest } from "@/types";

const router = Router();

router.get(
  "/api/search/video/ytsearch",
  async (req: Request, res: Response<any>) => {
    const { q } = req.query;
    const data = await getVideoListByYtsearch({ q: q as string });
    res.json({
      data
    });
  }
);

// 🔍 搜索频道（博主）
router.get(
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
 * 启动用户详情获取任务
 * POST /api/user-details/start
 * Body: { q: string, type: '1' | '2', count: number }
 */
router.post(
  "/api/user-details/start",
  async (req: Request, res: Response<UserDetailResponse | ErrorResponse>) => {
    try {
      const { q, type, count }: UserDetailRequest = req.body;

      console.log(req.body);
      // 参数验证
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "请提供搜索关键词 q" });
      }

      if (!type || (type !== "1" && type !== "2")) {
        return res
          .status(400)
          .json({ error: "请提供有效的类型参数 (1: 仅有邮箱, 2: 所有频道)" });
      }

      if (!count || typeof count !== "number" || count <= 0) {
        return res
          .status(400)
          .json({ error: "请提供有效的数量参数 count (> 0)" });
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
        status: "started",
        progress: task.progress,
        currentCount: task.currentCount,
        totalFound: task.totalFound,
        results: task.results,
      };

      res.json(response);

      console.log(
        `✅ 任务已启动: ${taskId}, 查询: "${q}", 类型: ${type}, 目标: ${count}`
      );
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
router.get(
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
router.delete(
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
router.get("/api/user-details/stats", (req: Request, res: Response) => {
  const stats = taskManager.getTasksStats();
  res.json({
    message: "任务管理器统计信息",
    ...stats,
    timestamp: new Date().toISOString(),
  });
});

export default router;
