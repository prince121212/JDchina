import { getTimestamp } from "./time";
import { log } from "./logger";

// get data from cache
export const cacheGet = (key: string): string | null => {
  // 检查是否在浏览器环境
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }

  try {
    let valueWithExpires = localStorage.getItem(key);
    if (!valueWithExpires) {
      return null;
    }

    let valueArr = valueWithExpires.split(":");
    if (!valueArr || valueArr.length < 2) {
      return null;
    }

    const expiresAt = Number(valueArr[0]);
    const currTimestamp = getTimestamp();

    if (expiresAt !== -1 && expiresAt < currTimestamp) {
      // value expired
      cacheRemove(key);
      return null;
    }

    const searchStr = valueArr[0] + ":";
    const value = valueWithExpires.replace(searchStr, "");

    return value;
  } catch (error) {
    log.warn("缓存获取错误", { error: error as Error, key });
    return null;
  }
};

// set data to cache
// expiresAt: absolute timestamp, -1 means no expire
export const cacheSet = (key: string, value: string, expiresAt: number) => {
  // 检查是否在浏览器环境
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  try {
    const valueWithExpires = expiresAt + ":" + value;
    localStorage.setItem(key, valueWithExpires);
  } catch (error) {
    log.warn("缓存设置错误", { error: error as Error, key });
  }
};

// remove data from cache
export const cacheRemove = (key: string) => {
  // 检查是否在浏览器环境
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch (error) {
    log.warn("缓存删除错误", { error: error as Error, key });
  }
};

// clear all datas from cache
export const cacheClear = () => {
  // 检查是否在浏览器环境
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.clear();
  } catch (error) {
    log.warn("缓存清理错误", { error: error as Error });
  }
};

// 资源相关的缓存键
export const resourceCacheKeys = {
  resource: (id: string) => `resource:${id}`,
  resourceList: (params: any) => `resources:${JSON.stringify(params)}`,
  categories: () => 'categories:all',
  tags: (type?: string) => `tags:${type || 'all'}`,
  userFavorites: (userId: string, page: number = 1) => `favorites:${userId}:${page}`,
  userUploads: (userId: string, page: number = 1) => `uploads:${userId}:${page}`,
  userRating: (userId: string, resourceId: string) => `rating:${userId}:${resourceId}`,
};

// 缓存TTL常量（分钟）
export const cacheTTL = {
  short: 2,      // 2分钟
  medium: 5,     // 5分钟
  long: 15,      // 15分钟
  veryLong: 60,  // 1小时
};

// 设置带TTL的缓存
export const cacheSetWithTTL = (key: string, value: any, ttlMinutes: number = cacheTTL.medium) => {
  const expiresAt = getTimestamp() + (ttlMinutes * 60);
  const serializedValue = JSON.stringify(value);
  cacheSet(key, serializedValue, expiresAt);
};

// 获取并解析JSON缓存
export const cacheGetJSON = (key: string): any | null => {
  const value = cacheGet(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    log.warn("缓存JSON解析错误", { error: error as Error, key });
    cacheRemove(key);
    return null;
  }
};

// 缓存失效工具函数
export const invalidateResourceCache = {
  // 失效单个资源缓存
  resource: (id: string) => {
    cacheRemove(resourceCacheKeys.resource(id));
  },

  // 失效资源列表缓存
  resourceList: () => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('resources:')) {
          cacheRemove(key);
        }
      });
    } catch (error) {
      log.warn("缓存失效错误", { error: error as Error });
    }
  },

  // 失效用户相关缓存
  user: (userId: string) => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    try {
      // 首先删除特定的用户缓存键
      cacheRemove(resourceCacheKeys.userFavorites(userId));
      cacheRemove(resourceCacheKeys.userUploads(userId));

      // 然后删除所有包含用户ID的缓存键
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(userId)) {
          cacheRemove(key);
        }
      });
    } catch (error) {
      log.warn("用户缓存失效错误", { error: error as Error, userId });
    }
  },

  // 失效所有缓存
  all: () => {
    cacheClear();
  },
};

// 智能缓存管理器
export class SmartCacheManager {
  private static instance: SmartCacheManager;
  private cacheStats: Map<string, { hits: number; misses: number; lastAccess: number }> = new Map();

  private constructor() {}

  static getInstance(): SmartCacheManager {
    if (!SmartCacheManager.instance) {
      SmartCacheManager.instance = new SmartCacheManager();
    }
    return SmartCacheManager.instance;
  }

  // 智能获取缓存
  get<T>(key: string, fallback: () => Promise<T>, ttl: number = cacheTTL.medium): Promise<T> {
    return new Promise(async (resolve) => {
      const cached = cacheGetJSON(key);
      const stats = this.cacheStats.get(key) || { hits: 0, misses: 0, lastAccess: 0 };

      if (cached !== null) {
        // 缓存命中
        stats.hits++;
        stats.lastAccess = Date.now();
        this.cacheStats.set(key, stats);
        resolve(cached);
      } else {
        // 缓存未命中
        stats.misses++;
        stats.lastAccess = Date.now();
        this.cacheStats.set(key, stats);

        try {
          const data = await fallback();
          cacheSetWithTTL(key, data, ttl);
          resolve(data);
        } catch (error) {
          log.error("智能缓存回退函数执行失败", error as Error, { key });
          throw error;
        }
      }
    });
  }

  // 获取缓存统计
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.cacheStats.forEach((value, key) => {
      const hitRate = value.hits + value.misses > 0
        ? (value.hits / (value.hits + value.misses) * 100).toFixed(2) + '%'
        : '0%';

      stats[key] = {
        ...value,
        hitRate,
        lastAccessTime: new Date(value.lastAccess).toISOString(),
      };
    });
    return stats;
  }
}

// 导出单例实例
export const smartCache = SmartCacheManager.getInstance();
