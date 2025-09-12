import Redis from 'ioredis';
import { ChannelWithEmails } from '@/types';

// Redis缓存键前缀
const CACHE_PREFIXES = {
  CHANNEL: 'yt:channel:',
  CHANNEL_SET: 'yt:channels:set',
  STATS: 'yt:stats:',
} as const;

// Redis缓存配置
interface RedisCacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

/**
 * Redis缓存服务类
 * 专门用于YouTube频道数据的缓存管理
 */
export class RedisCache {
  private redis: Redis;
  private isConnected: boolean = false;
  private fallbackCache: Map<string, any> = new Map(); // 降级时使用内存缓存
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24小时TTL (秒)
  
  constructor(config?: Partial<RedisCacheConfig>) {
    const defaultConfig: RedisCacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    this.redis = new Redis({
      host: finalConfig.host,
      port: finalConfig.port,
      password: finalConfig.password,
      db: finalConfig.db,
      retryDelayOnFailover: finalConfig.retryDelayOnFailover,
      maxRetriesPerRequest: finalConfig.maxRetriesPerRequest,
      lazyConnect: finalConfig.lazyConnect,
    });

    this.setupEventHandlers();
  }

  /**
   * 设置Redis事件处理器
   */
  private setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('✅ Redis连接成功');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis连接错误:', error.message);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('⚠️ Redis连接关闭');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis重连中...');
    });
  }

  /**
   * 确保Redis连接
   */
  private async ensureConnection(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      await this.redis.ping();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Redis连接失败，使用内存缓存降级:', error);
      return false;
    }
  }

  /**
   * 设置频道缓存
   */
  async setChannel(channelId: string, data: ChannelWithEmails, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
    const key = CACHE_PREFIXES.CHANNEL + channelId;
    
    try {
      if (await this.ensureConnection()) {
        const serializedData = JSON.stringify({
          data,
          timestamp: Date.now(),
          expireAt: Date.now() + (ttl * 1000),
        });

        await this.redis.setex(key, ttl, serializedData);
        
        // 将频道ID添加到集合中，便于管理
        await this.redis.sadd(CACHE_PREFIXES.CHANNEL_SET, channelId);
        
        return true;
      }
    } catch (error) {
      console.error(`Redis setChannel失败 (${channelId}):`, error);
    }

    // 降级到内存缓存
    this.fallbackCache.set(key, {
      data,
      timestamp: Date.now(),
      expireAt: Date.now() + (ttl * 1000),
    });
    
    return false;
  }

  /**
   * 获取频道缓存
   */
  async getChannel(channelId: string): Promise<ChannelWithEmails | null> {
    const key = CACHE_PREFIXES.CHANNEL + channelId;
    
    try {
      if (await this.ensureConnection()) {
        const cached = await this.redis.get(key);
        
        if (cached) {
          const parsedData = JSON.parse(cached);
          return parsedData.data;
        }
      }
    } catch (error) {
      console.error(`Redis getChannel失败 (${channelId}):`, error);
    }

    // 降级到内存缓存
    const fallbackData = this.fallbackCache.get(key);
    if (fallbackData && fallbackData.expireAt > Date.now()) {
      return fallbackData.data;
    }

    // 清理过期的内存缓存
    if (fallbackData && fallbackData.expireAt <= Date.now()) {
      this.fallbackCache.delete(key);
    }

    return null;
  }

  /**
   * 批量获取频道缓存
   */
  async getChannels(channelIds: string[]): Promise<Map<string, ChannelWithEmails>> {
    const result = new Map<string, ChannelWithEmails>();
    
    if (channelIds.length === 0) return result;

    try {
      if (await this.ensureConnection()) {
        const keys = channelIds.map(id => CACHE_PREFIXES.CHANNEL + id);
        const cached = await this.redis.mget(...keys);
        
        for (let i = 0; i < cached.length; i++) {
          if (cached[i]) {
            try {
              const parsedData = JSON.parse(cached[i] as string);
              result.set(channelIds[i], parsedData.data);
            } catch (parseError) {
              console.error(`解析缓存数据失败 (${channelIds[i]}):`, parseError);
            }
          }
        }
        
        return result;
      }
    } catch (error) {
      console.error('Redis批量获取失败:', error);
    }

    // 降级到内存缓存
    for (const channelId of channelIds) {
      const key = CACHE_PREFIXES.CHANNEL + channelId;
      const fallbackData = this.fallbackCache.get(key);
      
      if (fallbackData && fallbackData.expireAt > Date.now()) {
        result.set(channelId, fallbackData.data);
      }
    }

    return result;
  }

  /**
   * 删除频道缓存
   */
  async deleteChannel(channelId: string): Promise<boolean> {
    const key = CACHE_PREFIXES.CHANNEL + channelId;
    
    try {
      if (await this.ensureConnection()) {
        await this.redis.del(key);
        await this.redis.srem(CACHE_PREFIXES.CHANNEL_SET, channelId);
        return true;
      }
    } catch (error) {
      console.error(`Redis deleteChannel失败 (${channelId}):`, error);
    }

    // 从内存缓存中删除
    this.fallbackCache.delete(key);
    return false;
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache(): Promise<number> {
    let cleanedCount = 0;

    try {
      if (await this.ensureConnection()) {
        // Redis会自动处理过期键，这里主要清理集合中的引用
        const channelIds = await this.redis.smembers(CACHE_PREFIXES.CHANNEL_SET);
        
        const pipeline = this.redis.pipeline();
        for (const channelId of channelIds) {
          const key = CACHE_PREFIXES.CHANNEL + channelId;
          
          // 检查键是否存在
          const exists = await this.redis.exists(key);
          if (!exists) {
            pipeline.srem(CACHE_PREFIXES.CHANNEL_SET, channelId);
            cleanedCount++;
          }
        }
        
        await pipeline.exec();
      }
    } catch (error) {
      console.error('Redis清理过期缓存失败:', error);
    }

    // 清理内存缓存
    const now = Date.now();
    for (const [key, data] of this.fallbackCache.entries()) {
      if (data.expireAt <= now) {
        this.fallbackCache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    totalChannels: number;
    redisConnected: boolean;
    memoryFallbackSize: number;
    redisMemoryUsage?: string;
  }> {
    let totalChannels = 0;
    let redisMemoryUsage: string | undefined;

    try {
      if (await this.ensureConnection()) {
        totalChannels = await this.redis.scard(CACHE_PREFIXES.CHANNEL_SET);
        
        // 获取Redis内存使用情况
        const info = await this.redis.memory('usage', CACHE_PREFIXES.CHANNEL_SET);
        if (typeof info === 'number') {
          redisMemoryUsage = `${(info / 1024 / 1024).toFixed(2)} MB`;
        }
      }
    } catch (error) {
      console.error('获取Redis统计信息失败:', error);
    }

    return {
      totalChannels,
      redisConnected: this.isConnected,
      memoryFallbackSize: this.fallbackCache.size,
      redisMemoryUsage,
    };
  }

  /**
   * 设置缓存过期时间
   */
  async extendTTL(channelId: string, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
    const key = CACHE_PREFIXES.CHANNEL + channelId;
    
    try {
      if (await this.ensureConnection()) {
        const result = await this.redis.expire(key, ttl);
        return result === 1;
      }
    } catch (error) {
      console.error(`Redis extendTTL失败 (${channelId}):`, error);
    }

    return false;
  }

  /**
   * 关闭Redis连接
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('✅ Redis连接已关闭');
    } catch (error) {
      console.error('❌ 关闭Redis连接失败:', error);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      if (await this.ensureConnection()) {
        await this.redis.ping();
        const responseTime = Date.now() - startTime;
        
        return {
          status: 'ok',
          message: 'Redis连接正常',
          responseTime,
        };
      } else {
        return {
          status: 'error',
          message: 'Redis连接失败，使用内存缓存降级',
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Redis健康检查失败: ${error}`,
      };
    }
  }
}

// 导出单例实例
export const redisCache = new RedisCache();
export default RedisCache;
