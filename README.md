# YouTube 频道搜索工具

一个基于 React + Vite + Node.js + Express 的 YouTube 频道搜索工具，支持搜索频道并提取联系邮箱信息。

## 项目结构

```
InformationCollection/
├── client/                 # 前端项目 (React + Vite)
│   ├── src/
│   │   ├── services/       # API 服务 (@/services)
│   │   ├── utils/          # 工具函数 (@/utils)
│   │   ├── types.ts        # TypeScript 类型定义 (@/types)
│   │   ├── App.tsx         # 主应用组件
│   │   └── main.tsx        # 应用入口
│   ├── package.json
│   └── vite.config.ts
├── server/                 # 后端项目 (Node.js + Express)
│   ├── src/
│   │   ├── utils/          # 工具函数 (@/utils)
│   │   ├── types.ts        # TypeScript 类型定义 (@/types)
│   │   └── index.ts        # 服务器入口
│   ├── package.json
│   └── tsconfig.json
├── package.json            # 根目录包管理 (monorepo)
└── tsconfig.json           # 根目录 TypeScript 配置
```

### 路径解析

项目使用 `@` 作为路径别名：
- `@/` 在客户端指向 `client/src/`
- `@/` 在服务端指向 `server/src/`
- 支持跨项目引用：`@/server/*` 和 `@/client/*`

## 技术栈

### 前端
- **React 18** - 用户界面框架
- **Vite** - 构建工具和开发服务器
- **TypeScript** - 类型安全
- **Ant Design** - UI 组件库
- **Axios** - HTTP 客户端
- **XLSX** - Excel 导出功能

### 后端
- **Node.js** - 运行时环境
- **Express** - Web 框架
- **TypeScript** - 类型安全
- **Axios** - HTTP 客户端
- **CORS** - 跨域资源共享

## 功能特性

- 🔍 搜索 YouTube 频道
- 📧 自动提取频道联系邮箱
- 📊 显示频道统计数据（订阅数、观看数、视频数）
- 📈 数据表格展示和排序
- 📤 Excel 导出功能
- 🎨 现代化响应式 UI
- ⚡ 前后端分离架构

## 快速开始

### 环境要求

- Node.js 16+ 
- npm 或 yarn

### 安装依赖

```bash
# 安装所有依赖（使用 monorepo 结构，所有依赖安装在根目录）
npm install
```

### 环境配置

1. 在根目录创建 `.env` 文件：

```env
# YouTube API 配置
YOUTUBE_API_KEY=your_youtube_api_key_here

# 服务器配置
PORT=5432
FRONTEND_URL=http://localhost:5173

# 前端配置
VITE_API_URL=http://localhost:5432
```

### 开发模式

```bash
# 同时启动前端和后端开发服务器
npm run dev
```

或者分别启动：

```bash
# 启动后端服务器 (端口: 5432)
npm run dev:server

# 启动前端开发服务器 (端口: 5173)
npm run dev:client
```

### 生产构建

```bash
# 构建前端和后端
npm run build

# 启动生产服务器
npm start
```

## API 接口

### 搜索频道
```
GET /api/search/video?q={keyword}&type={type}&range={range}
```

参数：
- `q`: 搜索关键词
- `type`: 搜索类型 (1: 仅有邮箱的频道, 2: 所有频道详情)
- `range`: 搜索范围 (50, 100, 200, 500)

### 获取频道详情
```
GET /api/channel/{channelId}
```

### 健康检查
```
GET /api/health
```

## 开发说明

### 前端开发
- 使用 Vite 作为构建工具，支持热重载
- 使用 TypeScript 提供类型安全
- 使用 Ant Design 组件库
- 通过代理配置解决跨域问题

### 后端开发
- 使用 Express 框架
- 支持 CORS 跨域请求
- 使用 TypeScript 提供类型安全
- 集成 YouTube Data API v3

## 部署

### 前端部署
```bash
cd client
npm run build
# 将 dist 目录部署到静态文件服务器
```

### 后端部署
```bash
cd server
npm run build
npm start
# 或使用 PM2 等进程管理器
```

## 服务器配置

### 当前项目需求
- **Node.js**: 16+ (推荐 18.x)
- **内存**: 最少 2GB RAM
- **存储**: 最少 5GB 可用空间
- **网络**: 稳定的互联网连接

### 未来扩展需求 (数据库 + Redis)
- **内存**: 最少 8GB RAM (推荐 16GB+)
- **存储**: SSD 最少 100GB
- **CPU**: 4核心以上
- **数据库**: PostgreSQL 13+ 或 MySQL 8.0+
- **缓存**: Redis 6.0+

详细配置请参考 [SERVER_CONFIG.md](./SERVER_CONFIG.md)

## 部署方式

### 1. 本地部署
```bash
# 开发模式
./deploy.sh dev

# 生产模式
./deploy.sh prod
```

### 2. Docker 部署
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 3. 云服务部署
支持 AWS、阿里云、腾讯云等主流云服务商，详细配置请参考服务器配置文档。

## 注意事项

1. 需要申请 YouTube Data API v3 密钥
2. 确保 API 密钥有足够的配额
3. 前端和后端需要同时运行才能正常使用
4. 建议在生产环境中配置 HTTPS
5. 生产环境建议使用 PM2 进行进程管理
6. 定期备份数据库和重要配置文件

## 许可证

MIT License