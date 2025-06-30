import { createClient } from 'redis';
import { log } from './logger';

// Redis 客户端实例
let redisClient: ReturnType<typeof createClient> | null = null;

// 初始化 Redis 连接
async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      throw new Error('REDIS_URL 环境变量未配置');
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
      },
    });

    redisClient.on('error', (err) => {
      log.error('Redis 连接错误', { error: err });
    });

    redisClient.on('connect', () => {
      log.info('Redis 连接成功');
    });

    redisClient.on('disconnect', () => {
      log.warn('Redis 连接断开');
    });

    await redisClient.connect();
  }

  return redisClient;
}

// 终端信息接口
export interface TerminalInfo {
  terminal_sn: string;
  terminal_key: string;
  device_id: string;
  last_checkin?: string;
  created_at?: string;
}

// 缓存键名生成器
const CACHE_KEYS = {
  // 主终端信息（全局共享）
  mainTerminal: () => `sqb:main_terminal`,
  // 签到状态（按日期）
  checkin: (date: string) => `sqb:checkin:${date}`,
  // 支付订单（按订单号）
  payment: (clientSn: string) => `sqb:payment:${clientSn}`,
  // 用户会话（可选，用于跟踪用户状态）
  userSession: (userId: string) => `sqb:user:${userId}`,
} as const;

// 缓存过期时间（秒）
const CACHE_TTL = {
  terminal: 7 * 24 * 60 * 60, // 7天
  checkin: 24 * 60 * 60,      // 24小时
  payment: 30 * 60,           // 30分钟
} as const;

/**
 * 存储主终端信息到 Redis（全局共享）
 */
export async function storeMainTerminalInfo(terminalInfo: TerminalInfo): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = CACHE_KEYS.mainTerminal();

    const data = {
      ...terminalInfo,
      created_at: terminalInfo.created_at || new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };

    await client.setEx(key, CACHE_TTL.terminal, JSON.stringify(data));

    log.info('主终端信息已存储到 Redis', {
      device_id: terminalInfo.device_id,
      terminal_sn: terminalInfo.terminal_sn
    });
  } catch (error) {
    log.error('存储主终端信息失败', { error: error as Error });
    throw error;
  }
}

/**
 * 存储终端信息到 Redis（兼容旧版本）
 */
export async function storeTerminalInfo(terminalInfo: TerminalInfo): Promise<void> {
  return storeMainTerminalInfo(terminalInfo);
}

/**
 * 获取主终端信息（全局共享）
 */
export async function getMainTerminalInfo(): Promise<TerminalInfo | null> {
  try {
    const client = await getRedisClient();
    const key = CACHE_KEYS.mainTerminal();

    const data = await client.get(key);
    if (!data) {
      return null;
    }

    const terminalInfo = JSON.parse(data) as TerminalInfo;

    log.info('从 Redis 获取主终端信息', {
      device_id: terminalInfo.device_id,
      terminal_sn: terminalInfo.terminal_sn
    });

    return terminalInfo;
  } catch (error) {
    log.error('获取主终端信息失败', { error: error as Error });
    return null;
  }
}

/**
 * 从 Redis 获取终端信息（兼容旧版本）
 */
export async function getTerminalInfo(_deviceId?: string): Promise<TerminalInfo | null> {
  // 优先获取主终端信息
  return getMainTerminalInfo();
}

/**
 * 获取所有缓存的终端信息
 */
export async function getAllTerminalInfo(): Promise<TerminalInfo[]> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys('sqb:terminal:*');
    
    if (keys.length === 0) {
      return [];
    }

    const values = await client.mGet(keys);
    const terminals: TerminalInfo[] = [];

    for (const value of values) {
      if (value) {
        try {
          terminals.push(JSON.parse(value) as TerminalInfo);
        } catch (parseError) {
          log.warn('解析终端信息失败', { error: parseError as Error });
        }
      }
    }

    return terminals;
  } catch (error) {
    log.error('获取所有终端信息失败', { error: error as Error });
    return [];
  }
}

/**
 * 标记今日已签到
 */
export async function markCheckinToday(_deviceId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const today = new Date().toDateString();
    const key = CACHE_KEYS.checkin(today);

    await client.setEx(key, CACHE_TTL.checkin, new Date().toISOString());

    log.info('标记今日已签到', { date: today });
  } catch (error) {
    log.error('标记签到状态失败', { error: error as Error });
    throw error;
  }
}

/**
 * 检查今日是否已签到
 */
export async function hasCheckedInToday(_deviceId: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const today = new Date().toDateString();
    const key = CACHE_KEYS.checkin(today);

    const result = await client.get(key);
    return result !== null;
  } catch (error) {
    log.error('检查签到状态失败', { error: error as Error });
    return false;
  }
}

/**
 * 缓存支付订单信息
 */
export async function cachePaymentOrder(clientSn: string, orderData: any): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = CACHE_KEYS.payment(clientSn);
    
    const data = {
      ...orderData,
      cached_at: new Date().toISOString(),
    };

    await client.setEx(key, CACHE_TTL.payment, JSON.stringify(data));
    
    log.info('支付订单已缓存', { client_sn: clientSn });
  } catch (error) {
    log.error('缓存支付订单失败', { error: error as Error });
    throw error;
  }
}

/**
 * 获取缓存的支付订单信息
 */
export async function getCachedPaymentOrder(clientSn: string): Promise<any | null> {
  try {
    const client = await getRedisClient();
    const key = CACHE_KEYS.payment(clientSn);
    
    const data = await client.get(key);
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    log.error('获取缓存支付订单失败', { error: error as Error });
    return null;
  }
}

/**
 * 删除终端信息
 */
export async function deleteTerminalInfo(deviceId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const terminalKey = CACHE_KEYS.mainTerminal();

    // 删除主终端信息
    await client.del(terminalKey);

    // 删除相关的签到记录
    const checkinKeys = await client.keys(`sqb:checkin:*`);
    if (checkinKeys.length > 0) {
      await client.del(checkinKeys);
    }

    log.info('终端信息已删除', { device_id: deviceId });
  } catch (error) {
    log.error('删除终端信息失败', { error: error as Error });
    throw error;
  }
}

/**
 * 清理过期的缓存数据
 */
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const client = await getRedisClient();
    
    // Redis 会自动清理过期的键，这里主要用于日志记录
    const allKeys = await client.keys('sqb:*');
    
    log.info('缓存清理检查完成', { 
      total_keys: allKeys.length,
      message: 'Redis 自动处理过期键清理' 
    });
  } catch (error) {
    log.error('缓存清理失败', { error: error as Error });
  }
}

/**
 * 关闭 Redis 连接
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      log.info('Redis 连接已关闭');
    } catch (error) {
      log.error('关闭 Redis 连接失败', { error: error as Error });
    }
  }
}

/**
 * 获取 Redis 连接状态
 */
export async function getRedisStatus(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return { connected: true };
  } catch (error) {
    return { 
      connected: false, 
      error: (error as Error).message 
    };
  }
}
