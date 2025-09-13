# 多阶段构建 Dockerfile

# 阶段1: 构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# 复制前端依赖文件
COPY client/package*.json ./
COPY package*.json ../

# 安装依赖
RUN npm ci --only=production

# 复制前端源代码
COPY client/ .

# 构建前端
RUN npm run build

# 阶段2: 构建后端
FROM node:18-alpine AS backend-builder

WORKDIR /app/server

# 复制后端依赖文件
COPY server/package*.json ./
COPY package*.json ../

# 安装依赖
RUN npm ci --only=production

# 复制后端源代码
COPY server/ .

# 构建后端
RUN npm run build

# 阶段3: 生产镜像
FROM node:18-alpine AS production

# 安装必要的系统依赖
RUN apk add --no-cache \
    dumb-init \
    curl

# 创建应用用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# 复制构建后的文件
COPY --from=backend-builder --chown=nodejs:nodejs /app/server/dist ./server/dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/server/package*.json ./server/
COPY --from=frontend-builder --chown=nodejs:nodejs /app/client/dist ./client/dist

# 复制根目录文件
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs .env* ./

# 创建日志目录
RUN mkdir -p logs && chown nodejs:nodejs logs

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/dist/index.js"]
