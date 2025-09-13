# 服务器配置指南

## 当前项目配置需求

### 基础环境要求

#### 开发环境
- **Node.js**: 16+ (推荐 18.x 或 20.x)
- **npm**: 8+ 或 **yarn**: 1.22+
- **内存**: 最少 2GB RAM
- **存储**: 最少 5GB 可用空间
- **网络**: 稳定的互联网连接（用于访问 YouTube API）

#### 生产环境
- **Node.js**: 18.x 或 20.x (LTS 版本)
- **内存**: 最少 4GB RAM
- **存储**: 最少 10GB 可用空间
- **CPU**: 2核心以上
- **网络**: 稳定的互联网连接，建议带宽 10Mbps+

### 环境变量配置

创建 `.env` 文件：

```env
# YouTube API 配置
YOUTUBE_API_KEY=your_youtube_api_key_here

# 服务器配置
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:5173

# 前端配置
VITE_API_URL=http://localhost:3001

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs
```

### 端口配置

- **前端开发服务器**: 5173
- **后端API服务器**: 3001
- **生产环境**: 建议使用 80 (HTTP) 或 443 (HTTPS)

## 未来扩展配置（数据库 + Redis）

### 数据库配置选项

#### 1. PostgreSQL (推荐)
```env
# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_search
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**服务器要求**:
- **内存**: 最少 4GB RAM (推荐 8GB+)
- **存储**: SSD 最少 50GB
- **CPU**: 4核心以上
- **PostgreSQL**: 13+ 版本

#### 2. MySQL
```env
# MySQL 配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=youtube_search
DB_USER=your_username
DB_PASSWORD=your_password
DB_CHARSET=utf8mb4
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**服务器要求**:
- **内存**: 最少 4GB RAM (推荐 8GB+)
- **存储**: SSD 最少 50GB
- **CPU**: 4核心以上
- **MySQL**: 8.0+ 版本

#### 3. MongoDB
```env
# MongoDB 配置
MONGODB_URI=mongodb://localhost:27017/youtube_search
MONGODB_USER=your_username
MONGODB_PASSWORD=your_password
MONGODB_DB=youtube_search
```

**服务器要求**:
- **内存**: 最少 8GB RAM (推荐 16GB+)
- **存储**: SSD 最少 100GB
- **CPU**: 8核心以上
- **MongoDB**: 5.0+ 版本

### Redis 配置

```env
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_TTL=3600
REDIS_MAX_RETRIES=3
```

**服务器要求**:
- **内存**: 最少 2GB RAM (推荐 4GB+)
- **存储**: SSD 最少 20GB
- **CPU**: 2核心以上
- **Redis**: 6.0+ 版本

## 完整生产环境配置

### 单服务器部署

**推荐配置**:
- **CPU**: 8核心
- **内存**: 16GB RAM
- **存储**: 200GB SSD
- **网络**: 100Mbps 带宽
- **操作系统**: Ubuntu 20.04+ 或 CentOS 8+

**服务架构**:
```
┌─────────────────┐
│   Nginx (80/443)│
├─────────────────┤
│   Node.js App   │
├─────────────────┤
│   PostgreSQL    │
├─────────────────┤
│   Redis         │
└─────────────────┘
```

### 分布式部署

**负载均衡器**:
- **Nginx**: 反向代理 + 负载均衡
- **HAProxy**: 高可用负载均衡

**应用服务器** (2-3台):
- **CPU**: 4核心
- **内存**: 8GB RAM
- **存储**: 50GB SSD

**数据库服务器**:
- **CPU**: 8核心
- **内存**: 32GB RAM
- **存储**: 500GB SSD (主) + 500GB SSD (从)

**Redis 集群**:
- **主节点**: 4GB RAM
- **从节点**: 2GB RAM (2-3个)

## Docker 配置

### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: youtube_search
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 性能优化建议

### 1. 应用层优化
- 使用 PM2 进行进程管理
- 启用 gzip 压缩
- 实现请求缓存
- 使用连接池

### 2. 数据库优化
- 创建适当的索引
- 定期清理历史数据
- 使用读写分离
- 配置连接池

### 3. Redis 优化
- 配置内存淘汰策略
- 使用 Redis 集群
- 实现缓存预热
- 监控内存使用

### 4. 网络优化
- 使用 CDN 加速静态资源
- 启用 HTTP/2
- 配置 SSL/TLS
- 实现请求限流

## 监控和日志

### 监控指标
- CPU 使用率
- 内存使用率
- 磁盘 I/O
- 网络流量
- 数据库连接数
- Redis 命中率

### 日志管理
- 应用日志: Winston
- 访问日志: Nginx
- 错误日志: Sentry
- 性能日志: New Relic

## 安全配置

### 1. 网络安全
- 配置防火墙
- 使用 HTTPS
- 限制访问 IP
- 启用 DDoS 防护

### 2. 应用安全
- 输入验证
- SQL 注入防护
- XSS 防护
- CSRF 防护

### 3. 数据安全
- 数据库加密
- 敏感信息加密
- 定期备份
- 访问控制

## 成本估算

### 云服务商对比

#### AWS
- **EC2 t3.medium**: $30/月
- **RDS PostgreSQL**: $25/月
- **ElastiCache Redis**: $15/月
- **总计**: ~$70/月

#### 阿里云
- **ECS 2核4G**: ¥200/月
- **RDS PostgreSQL**: ¥150/月
- **Redis**: ¥100/月
- **总计**: ~¥450/月

#### 腾讯云
- **CVM 2核4G**: ¥180/月
- **TencentDB**: ¥120/月
- **Redis**: ¥80/月
- **总计**: ~¥380/月

### 自建服务器
- **物理服务器**: ¥3000-5000
- **带宽**: ¥200-500/月
- **电费**: ¥100-200/月
- **维护成本**: ¥500-1000/月
