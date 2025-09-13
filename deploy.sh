#!/bin/bash

# YouTube 搜索工具部署脚本

set -e

echo "🚀 开始部署 YouTube 搜索工具..."

# 检查 Node.js 版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装，请先安装 Node.js 16+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        echo "❌ Node.js 版本过低，需要 16+，当前版本: $(node -v)"
        exit 1
    fi
    
    echo "✅ Node.js 版本检查通过: $(node -v)"
}

# 安装依赖
install_dependencies() {
    echo "📦 安装项目依赖..."
    npm install
    echo "✅ 依赖安装完成"
}

# 构建项目
build_project() {
    echo "🔨 构建项目..."
    npm run build
    echo "✅ 项目构建完成"
}

# 检查环境变量
check_env() {
    if [ ! -f .env ]; then
        echo "⚠️  .env 文件不存在，创建示例文件..."
        cat > .env << EOF
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
EOF
        echo "📝 请编辑 .env 文件并设置正确的配置"
    else
        echo "✅ 环境变量文件存在"
    fi
}

# 创建必要目录
create_directories() {
    echo "📁 创建必要目录..."
    mkdir -p server/logs
    mkdir -p server/dist
    mkdir -p client/dist
    echo "✅ 目录创建完成"
}

# 启动服务
start_services() {
    echo "🚀 启动服务..."
    
    # 检查端口是否被占用
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  端口 3001 已被占用，请先停止相关服务"
        exit 1
    fi
    
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  端口 5173 已被占用，请先停止相关服务"
        exit 1
    fi
    
    # 启动开发服务
    if [ "$1" = "dev" ]; then
        echo "🔧 启动开发模式..."
        npm run dev
    else
        echo "🏭 启动生产模式..."
        npm start
    fi
}

# 主函数
main() {
    echo "=========================================="
    echo "    YouTube 搜索工具部署脚本"
    echo "=========================================="
    
    check_node_version
    check_env
    create_directories
    
    if [ "$1" = "dev" ]; then
        install_dependencies
        start_services "dev"
    elif [ "$1" = "prod" ]; then
        install_dependencies
        build_project
        start_services "prod"
    else
        echo "使用方法:"
        echo "  ./deploy.sh dev   # 开发模式"
        echo "  ./deploy.sh prod  # 生产模式"
        exit 1
    fi
}

# 执行主函数
main "$@"
