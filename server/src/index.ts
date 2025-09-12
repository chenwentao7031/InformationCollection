// server/src/index.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import youtubeRouter from "@/routers/youtebe";

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

app.listen(PORT, () => {
  console.log(`✅ YouTube搜索后端服务已启动：http://localhost:${PORT}`);
  console.log(`🔍 API文档：http://localhost:${PORT}/api/health`);
  console.log(APIKEY)
});
