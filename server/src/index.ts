// server/src/index.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import youtubeRouter from "@/routers/youtebe";
import { redisCache } from "@/services/RedisCache";

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

app.use(youtubeRouter);

// 健康检查端点
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "YouTube搜索服务运行正常" });
});

const server = app.listen(PORT, async () => {
  console.log(`✅ YouTube搜索后端服务已启动：http://localhost:${PORT}`);
  console.log(`🔍 API文档：http://localhost:${PORT}/api/health`);
  
  // 检查Redis连接状态
  try {
    const healthCheck = await redisCache.healthCheck();
    if (healthCheck.status === 'ok') {
      console.log(`✅ Redis缓存连接正常 (响应时间: ${healthCheck.responseTime}ms)`);
    } else {
      console.log(`⚠️ Redis缓存连接异常，将使用内存缓存降级`);
    }
  } catch (error) {
    console.log(`⚠️ Redis缓存初始化失败，将使用内存缓存降级`);
  }
});

// 优雅关闭处理
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🔄 接收到 ${signal} 信号，开始优雅关闭...`);
  
  // 关闭HTTP服务器
  server.close(async () => {
    console.log('✅ HTTP服务器已关闭');
    
    try {
      // 关闭Redis连接
      await redisCache.close();
      console.log('✅ Redis连接已关闭');
      
      console.log('✅ 应用程序优雅关闭完成');
      process.exit(0);
    } catch (error: any) {
      console.error('❌ 关闭过程中发生错误:', error.message);
      process.exit(1);
    }
  });
  
  // 如果10秒内没有完成关闭，强制退出
  setTimeout(() => {
    console.error('❌ 强制关闭应用程序（超时）');
    process.exit(1);
  }, 10000);
};

// 监听关闭信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  gracefulShutdown('unhandledRejection');
});
