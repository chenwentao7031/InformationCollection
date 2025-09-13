#!/bin/bash

# YouTube 搜索工具部署脚本

set -e

echo "🚀 开始部署 YouTube 搜索工具..."

# 检查环境
check_environment() {
    echo "🔍 检查环境配置..."
    
    # 使用 Node.js 脚本进行详细检查
    if command -v node &> /dev/null; then
        node check-env.js
        if [ $? -ne 0 ]; then
            echo "❌ 环境检查失败，请按照提示安装正确的版本"
            exit 1
        fi
    else
        echo "❌ Node.js 未安装，请先安装 Node.js 20.18+"
        echo "请访问 https://nodejs.org 下载最新版本"
        exit 1
    fi
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
    
    check_environment
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
