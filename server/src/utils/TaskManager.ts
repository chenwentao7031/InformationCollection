// 简单的ID生成函数
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
import youtubeApi from '@/apis/youtubeRequest';
import { findEmails } from '@/utils/tool';
import {
  UserDetailTask,
  ChannelWithEmails,
  YouTubeChannelItem,
  YouTubeChannelDetail,
} from '@/types';
import { getChannelDetail, getVideoList } from '@/apis/youtubeApi';

class TaskManager {
  private tasks: Map<string, UserDetailTask> = new Map();
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private APIKEY = process.env.YOUTUBE_API_KEY;

  /**
   * 创建新任务
   */
  createTask(query: string, type: '1' | '2', count: number): string {
    const taskId = generateId();
    const task: UserDetailTask = {
      taskId,
      query,
      type,
      count,
      status: 'running',
      progress: 0,
      currentCount: 0,
      totalFound: 0,
      results: [],
      startTime: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.startTask(taskId);
    return taskId;
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): UserDetailTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 停止任务
   */
  stopTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'running') {
      task.status = 'stopped';
      const interval = this.activeIntervals.get(taskId);
      if (interval) {
        clearInterval(interval);
        this.activeIntervals.delete(taskId);
      }
      return true;
    }
    return false;
  }

  /**
   * 强制清楚所有任务，清楚定时器，清楚任务列表
   * 
   */
  forceClearAllTasks(): void {
    Array.from(this.activeIntervals.values()).forEach(interval => {
      clearInterval(interval);
    });
    this.tasks.clear();
    this.activeIntervals.clear();
  }


  /**
   * 清理完成的任务（可选，避免内存泄露）
   */
  cleanupTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && (task.status === 'completed' || task.status === 'stopped' || task.status === 'error')) {
      this.tasks.delete(taskId);
      const interval = this.activeIntervals.get(taskId);
      if (interval) {
        clearInterval(interval);
        this.activeIntervals.delete(taskId);
      }
      return true;
    }
    return false;
  }

  /**
   * 开始执行任务
   */
  private async startTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      await this.processTask(task);
    } catch (error: any) {
      task.status = 'error';
      task.error = error.message;
      console.error(`Task ${taskId} failed:`, error);
    }
  }

  /**
   * 处理任务逻辑
   */
  private async processTask(task: UserDetailTask) {
    let nextPageToken: string | undefined = undefined;
    const uniqueChannelIds = new Set<string>();
    
    try {
      while (task.status === 'running' && task.currentCount < task.count) {
        // 1. 获取视频列表youtubeApi.get('/search', {
        const videoResponse = await getVideoList({
          q: task.query,
          maxResults: 5,
          ...(nextPageToken && { pageToken: nextPageToken }),
        })


        const videos: YouTubeChannelItem[] = videoResponse?.items || [];
        nextPageToken = videoResponse?.nextPageToken;

        // 2. 提取并去重频道ID
        for (const video of videos) {
          if (video.snippet?.channelId) {
            uniqueChannelIds.add(video.snippet.channelId);
          }
        }
        console.log(uniqueChannelIds)
        // 3. 批量获取频道详情
        const channelIds = Array.from(uniqueChannelIds).slice(task.results.length);
        const batchSize = 50; // YouTube API限制

        for (let i = 0; i < channelIds.length && task.status === 'running'; i += batchSize) {
          const batch = channelIds.slice(i, i + batchSize);
          
          try {
            const channelResponse = await getChannelDetail(batch);
            console.log(channelResponse)

            const channels: YouTubeChannelDetail[] = channelResponse.items || [];
            
            // 4. 处理频道数据
            for (const channel of channels) {
              if (task.status !== 'running') break;

              const emails = findEmails([
                channel?.snippet?.description || '',
                channel?.snippet?.localized?.description || '',
                channel?.brandingSettings?.channel?.description || ''
              ]);

              // 5. 根据type过滤
              const shouldInclude = task.type === '2' || (task.type === '1' && emails.length > 0);
              
              if (shouldInclude) {
                const channelWithEmails: ChannelWithEmails = {
                  channelId: channel.id,
                  title: channel.snippet.title,
                  description: channel.snippet.description,
                  customUrl: channel.snippet.customUrl,
                  subscribers: channel.statistics.subscriberCount,
                  views: channel.statistics.viewCount,
                  videos: channel.statistics.videoCount,
                  thumbnail: channel.snippet.thumbnails.default.url,
                  emails: emails,
                  keywords: channel.brandingSettings?.channel?.keywords,
                };

                task.results.push(channelWithEmails);
                task.currentCount++;
                task.totalFound++;
                
                // 更新进度
                task.progress = Math.floor((task.currentCount / task.count) * 100);

                // 如果达到目标数量，完成任务
                if (task.currentCount >= task.count) {
                  task.status = 'completed';
                  task.progress = 100;
                  return;
                }
              }
            }
          } catch (error: any) {
            console.error(`获取频道详情失败 (batch ${i}):`, error.message);
            task.status = 'stopped';
            // 继续处理其他批次，而不是失败整个任务
          }
        }

        // 6. 如果没有更多页面或达到API限制，结束任务
        if (!nextPageToken || uniqueChannelIds.size >= 1000) {
          task.status = 'completed';
          task.progress = 100;
          break;
        }

        // 添加延迟以避免API限制
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 如果循环结束但任务仍在运行，标记为完成
      if (task.status === 'running') {
        task.status = 'completed';
        task.progress = 100;
      }

    } catch (error: any) {
      task.status = 'error';
      task.error = error.message;
      console.error(`任务 ${task.taskId} 执行失败:`, error);
    }
  }

  /**
   * 获取所有活跃任务的数量
   */
  getActiveTasksCount(): number {
    return Array.from(this.tasks.values()).filter(task => task.status === 'running').length;
  }

  /**
   * 获取任务统计信息
   */
  getTasksStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      stopped: tasks.filter(t => t.status === 'stopped').length,
      error: tasks.filter(t => t.status === 'error').length,
    };
  }
}

// 导出单例实例
export const taskManager = new TaskManager();
export default TaskManager;
