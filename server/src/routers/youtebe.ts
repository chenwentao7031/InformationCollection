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

// 🔍 搜索频道（博主） 废弃，使用ytsearch代替
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
    res.json({
      data: []
    });
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
