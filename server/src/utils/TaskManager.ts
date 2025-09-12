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
import { redisCache } from '@/services/RedisCache';

// API限流配置
interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  currentMinuteRequests: number;
  currentDayRequests: number;
  minuteResetTime: number;
  dayResetTime: number;
}

class TaskManager {
  private tasks: Map<string, UserDetailTask> = new Map();
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private APIKEY = process.env.YOUTUBE_API_KEY;
  
  // API限流控制
  private rateLimit: RateLimitConfig = {
    requestsPerMinute: 100, // YouTube API限制
    requestsPerDay: 10000,  // YouTube API配额
    currentMinuteRequests: 0,
    currentDayRequests: 0,
    minuteResetTime: Date.now() + 60000,
    dayResetTime: Date.now() + 24 * 60 * 60 * 1000,
  };
  
  // 延迟控制
  private lastRequestTime: number = 0;
  private consecutiveErrors: number = 0;

  /**
   * 检查并更新API限流状态
   */
  private checkRateLimit(): { allowed: boolean; delay: number } {
    const now = Date.now();
    
    // 重置分钟计数器
    if (now > this.rateLimit.minuteResetTime) {
      this.rateLimit.currentMinuteRequests = 0;
      this.rateLimit.minuteResetTime = now + 60000;
    }
    
    // 重置日计数器  
    if (now > this.rateLimit.dayResetTime) {
      this.rateLimit.currentDayRequests = 0;
      this.rateLimit.dayResetTime = now + 24 * 60 * 60 * 1000;
    }
    
    // 检查是否超出限制
    if (this.rateLimit.currentMinuteRequests >= this.rateLimit.requestsPerMinute ||
        this.rateLimit.currentDayRequests >= this.rateLimit.requestsPerDay) {
      const delayUntilMinuteReset = this.rateLimit.minuteResetTime - now;
      const delayUntilDayReset = this.rateLimit.dayResetTime - now;
      return { 
        allowed: false, 
        delay: Math.min(delayUntilMinuteReset, delayUntilDayReset) 
      };
    }
    
    // 计算智能延迟（基于错误次数的指数退避）
    const baseDelay = 1000; // 基础延迟1秒
    const errorMultiplier = Math.pow(2, Math.min(this.consecutiveErrors, 5)); // 最多32倍
    const timeSinceLastRequest = now - this.lastRequestTime;
    const requiredDelay = baseDelay * errorMultiplier;
    const additionalDelay = Math.max(0, requiredDelay - timeSinceLastRequest);
    
    return { allowed: true, delay: additionalDelay };
  }
  
  /**
   * 记录API请求
   */
  private recordApiRequest(success: boolean = true) {
    const now = Date.now();
    this.rateLimit.currentMinuteRequests++;
    this.rateLimit.currentDayRequests++;
    this.lastRequestTime = now;
    
    if (success) {
      this.consecutiveErrors = 0;
    } else {
      this.consecutiveErrors++;
    }
  }
  
  /**
   * 从Redis缓存获取频道数据
   */
  private async getFromCache(channelId: string): Promise<ChannelWithEmails | null> {
    try {
      return await redisCache.getChannel(channelId);
    } catch (error) {
      console.error(`获取缓存失败 (${channelId}):`, error);
      return null;
    }
  }
  
  /**
   * 批量从Redis缓存获取频道数据
   */
  private async getBatchFromCache(channelIds: string[]): Promise<Map<string, ChannelWithEmails>> {
    try {
      return await redisCache.getChannels(channelIds);
    } catch (error) {
      console.error('批量获取缓存失败:', error);
      return new Map();
    }
  }
  
  /**
   * 保存到Redis缓存
   */
  private async saveToCache(channelId: string, data: ChannelWithEmails): Promise<void> {
    try {
      await redisCache.setChannel(channelId, data);
    } catch (error) {
      console.error(`保存缓存失败 (${channelId}):`, error);
    }
  }
  
  /**
   * 清理过期缓存
   */
  private async cleanExpiredCache(): Promise<number> {
    try {
      return await redisCache.cleanExpiredCache();
    } catch (error) {
      console.error('清理过期缓存失败:', error);
      return 0;
    }
  }
  
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
   * 处理任务逻辑 - 优化版本
   */
  private async processTask(task: UserDetailTask) {
    let nextPageToken: string | undefined = undefined;
    const allDiscoveredChannelIds = new Set<string>(); // 所有发现的频道ID
    const processedChannelIds = new Set<string>(); // 已经处理过的频道ID
    
    // 定期清理过期缓存
    await this.cleanExpiredCache();
    
    try {
      while (task.status === 'running' && task.currentCount < task.count) {
        
        // 检查API限流
        const rateLimitCheck = this.checkRateLimit();
        if (!rateLimitCheck.allowed) {
          console.log(`API配额限制，等待 ${rateLimitCheck.delay}ms`);
          await new Promise(resolve => setTimeout(resolve, rateLimitCheck.delay));
          continue;
        }
        
        // 应用智能延迟
        if (rateLimitCheck.delay > 0) {
          console.log(`智能延迟 ${rateLimitCheck.delay}ms`);
          await new Promise(resolve => setTimeout(resolve, rateLimitCheck.delay));
        }
        
        try {
          // 1. 获取视频列表
          const videoResponse = await getVideoList({
            q: task.query,
            maxResults: 30, // 适度增加以减少API调用次数
            ...(nextPageToken && { pageToken: nextPageToken }),
          });
          
          this.recordApiRequest(true); // 记录成功的API请求
          
          const videos: YouTubeChannelItem[] = videoResponse?.items || [];
          nextPageToken = videoResponse?.nextPageToken;

          // 2. 提取新的频道ID，优先处理缓存中没有的
          const candidateChannelIds: string[] = [];
          const channelPriority: { channelId: string; priority: number }[] = [];
          
          // 先收集所有未处理的频道ID
          for (const video of videos) {
            if (video.snippet?.channelId && !processedChannelIds.has(video.snippet.channelId)) {
              allDiscoveredChannelIds.add(video.snippet.channelId);
              processedChannelIds.add(video.snippet.channelId);
              
              candidateChannelIds.push(video.snippet.channelId);
              
              // 计算优先级：视频发布时间越新，优先级越高
              const publishTime = new Date(video.snippet.publishedAt).getTime();
              const daysSincePublish = (Date.now() - publishTime) / (1000 * 60 * 60 * 24);
              const priority = Math.max(1, 100 - daysSincePublish);
              
              channelPriority.push({ 
                channelId: video.snippet.channelId, 
                priority: priority 
              });
            }
          }
          
          // 批量从缓存获取频道数据
          const cachedChannelsMap = await this.getBatchFromCache(candidateChannelIds);
          const cachedResults: ChannelWithEmails[] = [];
          const newChannelIds: string[] = [];
          
          // 根据优先级排序
          channelPriority.sort((a, b) => b.priority - a.priority);
          
          for (const cp of channelPriority) {
            const cachedChannel = cachedChannelsMap.get(cp.channelId);
            if (cachedChannel) {
              const shouldInclude = task.type === '2' || (task.type === '1' && cachedChannel.emails.length > 0);
              if (shouldInclude) {
                cachedResults.push(cachedChannel);
              }
            } else {
              newChannelIds.push(cp.channelId);
            }
          }
          
          // 3. 处理缓存中的结果
          for (const cachedChannel of cachedResults) {
            if (task.status !== 'running' || task.currentCount >= task.count) break;
            
            task.results.push(cachedChannel);
            task.currentCount++;
            task.totalFound++;
            
            // 更新进度
            task.progress = Math.floor((task.currentCount / task.count) * 100);
            
            if (task.currentCount >= task.count) {
              task.status = 'completed';
              task.progress = 100;
              return;
            }
          }

          console.log(`缓存命中: ${cachedResults.length}, 新频道: ${newChannelIds.length}, 总发现: ${allDiscoveredChannelIds.size}`);
          
          // 4. 如果没有新的频道ID，继续下一页或结束
          if (newChannelIds.length === 0) {
            if (!nextPageToken) {
              console.log('没有更多页面，任务结束');
              break;
            }
            console.log('当前页面没有新频道，继续下一页');
            continue;
          }

          // 5. 智能批量获取新频道的详情
          const batchSize = Math.min(20, newChannelIds.length); // 降低批处理大小以减少API消耗
          
          for (let i = 0; i < newChannelIds.length && task.status === 'running'; i += batchSize) {
            // 再次检查API限流
            const batchRateLimit = this.checkRateLimit();
            if (!batchRateLimit.allowed) {
              console.log(`批处理API配额限制，等待 ${batchRateLimit.delay}ms`);
              await new Promise(resolve => setTimeout(resolve, batchRateLimit.delay));
              continue;
            }
            
            if (batchRateLimit.delay > 0) {
              await new Promise(resolve => setTimeout(resolve, batchRateLimit.delay));
            }
            
            const batch = newChannelIds.slice(i, i + batchSize);
            
            try {
              const channelResponse = await getChannelDetail(batch);
              this.recordApiRequest(true);
              
              const channels: YouTubeChannelDetail[] = channelResponse.items || [];
              
              // 6. 处理频道数据并缓存
              for (const channel of channels) {
                if (task.status !== 'running') break;

                const emails = findEmails([
                  channel?.snippet?.description || '',
                  channel?.snippet?.localized?.description || '',
                  channel?.brandingSettings?.channel?.description || ''
                ]);

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

                // 保存到缓存
                await this.saveToCache(channel.id, channelWithEmails);

                // 7. 根据type过滤
                const shouldInclude = task.type === '2' || (task.type === '1' && emails.length > 0);
                
                if (shouldInclude) {
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
              this.recordApiRequest(false); // 记录失败的API请求
              console.error(`获取频道详情失败 (batch ${i}):`, error.message);
              
              // 如果是配额限制错误，暂停更长时间
              if (error.message.includes('quotaExceeded') || error.message.includes('rateLimitExceeded')) {
                console.log('检测到配额限制，暂停60秒');
                await new Promise(resolve => setTimeout(resolve, 60000));
              }
              
              // 不立即停止任务，而是继续处理其他批次
              continue;
            }
          }

          // 8. 如果没有更多页面或达到合理限制，结束任务
          if (!nextPageToken || allDiscoveredChannelIds.size >= 800) { // 降低限制以节省API配额
            console.log(`任务完成条件: nextPageToken=${!!nextPageToken}, 发现频道数=${allDiscoveredChannelIds.size}`);
            task.status = 'completed';
            task.progress = 100;
            break;
          }
          
        } catch (error: any) {
          this.recordApiRequest(false);
          console.error(`视频列表获取失败:`, error.message);
          
          // 如果是配额限制，等待更长时间
          if (error.message.includes('quotaExceeded') || error.message.includes('rateLimitExceeded')) {
            console.log('检测到视频搜索配额限制，暂停2分钟');
            await new Promise(resolve => setTimeout(resolve, 120000));
          } else {
            // 其他错误，应用指数退避
            const delay = Math.min(30000, 1000 * Math.pow(2, this.consecutiveErrors));
            console.log(`API错误，等待 ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
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
   * 获取API使用统计
   */
  async getApiStats() {
    const cacheStats = await redisCache.getCacheStats();
    
    return {
      rateLimit: {
        requestsPerMinute: this.rateLimit.requestsPerMinute,
        requestsPerDay: this.rateLimit.requestsPerDay,
        currentMinuteRequests: this.rateLimit.currentMinuteRequests,
        currentDayRequests: this.rateLimit.currentDayRequests,
        remainingMinuteRequests: Math.max(0, this.rateLimit.requestsPerMinute - this.rateLimit.currentMinuteRequests),
        remainingDayRequests: Math.max(0, this.rateLimit.requestsPerDay - this.rateLimit.currentDayRequests),
        minuteResetIn: Math.max(0, this.rateLimit.minuteResetTime - Date.now()),
        dayResetIn: Math.max(0, this.rateLimit.dayResetTime - Date.now()),
      },
      cache: {
        totalCached: cacheStats.totalChannels,
        redisConnected: cacheStats.redisConnected,
        memoryFallbackSize: cacheStats.memoryFallbackSize,
        redisMemoryUsage: cacheStats.redisMemoryUsage,
      },
      performance: {
        consecutiveErrors: this.consecutiveErrors,
        lastRequestTime: this.lastRequestTime,
      }
    };
  }
  
  /**
   * 获取任务统计信息
   */
  async getTasksStats() {
    const tasks = Array.from(this.tasks.values());
    const apiStats = await this.getApiStats();
    
    return {
      total: tasks.length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      stopped: tasks.filter(t => t.status === 'stopped').length,
      error: tasks.filter(t => t.status === 'error').length,
      api: apiStats,
    };
  }
  
  /**
   * 检查API配额预警
   */
  checkQuotaWarning(): { warning: boolean; message?: string } {
    const minuteUsagePercent = (this.rateLimit.currentMinuteRequests / this.rateLimit.requestsPerMinute) * 100;
    const dayUsagePercent = (this.rateLimit.currentDayRequests / this.rateLimit.requestsPerDay) * 100;
    
    if (dayUsagePercent >= 90) {
      return { 
        warning: true, 
        message: `日配额使用率已达 ${dayUsagePercent.toFixed(1)}%，请谨慎使用API` 
      };
    }
    
    if (minuteUsagePercent >= 80) {
      return { 
        warning: true, 
        message: `分钟配额使用率已达 ${minuteUsagePercent.toFixed(1)}%，系统将自动限流` 
      };
    }
    
    return { warning: false };
  }
  
  /**
   * 获取缓存健康状态
   */
  async getCacheHealthStatus() {
    try {
      return await redisCache.healthCheck();
    } catch (error: any) {
      return {
        status: 'error' as const,
        message: `缓存健康检查失败: ${error.message}`,
      };
    }
  }
  
  /**
   * 清理过期缓存（供外部调用）
   */
  async cleanupExpiredCache(): Promise<number> {
    return await this.cleanExpiredCache();
  }
}

// 导出单例实例
export const taskManager = new TaskManager();
export default TaskManager;
