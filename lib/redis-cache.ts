import { createClient } from 'redis';
import { log } from './logger';

// Redis 客户端实例
let redisClient: ReturnType<typeof createClient> | null = null;
let isConnecting = false; // 连接状态锁
let lastConnectionAttempt = 0; // 最后连接尝试时间
const CONNECTION_COOLDOWN = 5000; // 连接冷却时间5秒
let lastHealthCheck = 0; // 最后健康检查时间
const HEALTH_CHECK_INTERVAL = 30000; // 健康检查间隔30秒

// 初始化 Redis 连接
async function getRedisClient() {
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }

  // 连接状态锁，防止并发连接
  if (isConnecting) {
    // 等待连接完成
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (redisClient && redisClient.isReady) {
      return redisClient;
    }
  }

  // 连接冷却机制，避免频繁重连
  const now = Date.now();
  if (now - lastConnectionAttempt < CONNECTION_COOLDOWN) {
    const waitTime = CONNECTION_COOLDOWN - (now - lastConnectionAttempt);
    log.info(`Redis 连接冷却中，等待 ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastConnectionAttempt = now;
  isConnecting = true;

  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL 环境变量未配置');
    }

    // 清理旧连接
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (e) {
        // 忽略清理错误
      }
      redisClient = null;
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 15000,    // 进一步增加连接超时到15秒
        keepAlive: true,          // 启用保持连接活跃
        noDelay: true,            // 禁用 Nagle 算法，减少延迟
        reconnectStrategy: (retries) => {
          // 更保守的重连策略：最多重试3次，递增间隔
          if (retries > 3) {
            log.error(`Redis 重连失败，已达到最大重试次数: ${retries}`);
            return false;
          }
          const delay = Math.min(retries * 3000, 10000); // 3秒、6秒、9秒
          log.info(`Redis 重连策略: 第${retries}次重试，${delay}ms后重连`);
          return delay;
        },
      },
      // 优化队列和缓存设置
      disableOfflineQueue: false,  // 保持离线队列
      commandsQueueMaxLength: 50,  // 减少命令队列长度，避免积压
    });

    // 优化的错误处理
    redisClient.on('error', (err) => {
      const errorMsg = err?.message || 'Unknown error';
      log.error('Redis 连接错误', new Error(errorMsg));

      // 只在严重错误时重置连接
      if (errorMsg.includes('ECONNREFUSED') ||
          errorMsg.includes('ETIMEDOUT') ||
          errorMsg.includes('ENOTFOUND')) {
        log.warn('Redis 严重错误，重置连接状态');
        redisClient = null;
        isConnecting = false;
      }
    });

    redisClient.on('connect', () => {
      log.info('Redis 连接成功');
      isConnecting = false; // 重置连接状态
    });

    redisClient.on('disconnect', () => {
      log.warn('Redis 连接断开');
      // 不立即重置 redisClient，让重连策略处理
      isConnecting = false;
    });

    redisClient.on('reconnecting', () => {
      log.info('Redis 重连中...');
      isConnecting = true; // 设置连接状态
    });

    redisClient.on('ready', () => {
      log.info('Redis 连接就绪');
      isConnecting = false; // 确保连接状态正确
    });

    redisClient.on('end', () => {
      log.warn('Redis 连接已结束');
      redisClient = null;
      isConnecting = false;
    });

    // 使用超时控制连接
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis 连接超时(15秒)')), 15000);
    });

    await Promise.race([connectPromise, timeoutPromise]);
    return redisClient;

  } catch (error) {
    redisClient = null;
    log.error('Redis 连接初始化失败', error as Error);
    throw error;
  } finally {
    isConnecting = false;
  }
}

// 终端信息接口
export interface TerminalInfo {
  terminal_sn: string;
  terminal_key: string;
  device_id: string;
  last_checkin?: string;
  created_at?: string;
}

// 支付订单数据接口
export interface PaymentOrderData {
  client_sn: string;
  device_id: string;
  terminal_sn: string;
  amount: number;
  subject: string;
  payway: string;
  qr_code?: string;
  cached_at?: string;
  [key: string]: unknown; // 允许其他字段
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
    await safeRedisOperation(async (client) => {
      const key = CACHE_KEYS.mainTerminal();

      const data = {
        ...terminalInfo,
        created_at: terminalInfo.created_at || new Date().toISOString(),
        last_updated: new Date().toISOString(),
      };

      await client.setEx(key, CACHE_TTL.terminal, JSON.stringify(data));
    });

    log.info('主终端信息已存储到 Redis', {
      device_id: terminalInfo.device_id,
      terminal_sn: terminalInfo.terminal_sn
    });
  } catch (error) {
    log.error('存储主终端信息失败', error as Error);
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
    return await safeRedisOperation(async (client) => {
      const key = CACHE_KEYS.mainTerminal();

      const data = await client.get(key);
      if (!data) {
        return null;
      }

      const terminalInfo = JSON.parse(data.toString()) as TerminalInfo;

      log.info('从 Redis 获取主终端信息', {
        device_id: terminalInfo.device_id,
        terminal_sn: terminalInfo.terminal_sn
      });

      return terminalInfo;
    });
  } catch (error) {
    log.error('获取主终端信息失败', error as Error);
    return null;
  }
}

/**
 * 从 Redis 获取终端信息（兼容旧版本）
 */
export async function getTerminalInfo(deviceId?: string): Promise<TerminalInfo | null> {
  // 优先获取主终端信息，deviceId 参数保留用于兼容性
  log.debug('获取终端信息', { device_id: deviceId, method: 'getMainTerminalInfo' });
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
          terminals.push(JSON.parse(value.toString()) as TerminalInfo);
        } catch (parseError) {
          log.warn('解析终端信息失败', parseError as Error);
        }
      }
    }

    return terminals;
  } catch (error) {
    log.error('获取所有终端信息失败', error as Error);
    return [];
  }
}

/**
 * 标记今日已签到
 */
export async function markCheckinToday(deviceId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const today = new Date().toDateString();
    const key = CACHE_KEYS.checkin(today);

    await client.setEx(key, CACHE_TTL.checkin, new Date().toISOString());

    log.info('标记今日已签到', { date: today, device_id: deviceId });
  } catch (error) {
    log.error('标记签到状态失败', error as Error);
    throw error;
  }
}

/**
 * 检查今日是否已签到
 */
export async function hasCheckedInToday(deviceId: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const today = new Date().toDateString();
    const key = CACHE_KEYS.checkin(today);

    const result = await client.get(key);
    log.debug('检查签到状态', { device_id: deviceId, has_checked_in: result !== null });
    return result !== null;
  } catch (error) {
    log.error('检查签到状态失败', error as Error);
    return false;
  }
}

/**
 * 缓存支付订单信息
 */
export async function cachePaymentOrder(clientSn: string, orderData: PaymentOrderData): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = CACHE_KEYS.payment(clientSn);

    const data: PaymentOrderData = {
      ...orderData,
      cached_at: new Date().toISOString(),
    };

    await client.setEx(key, CACHE_TTL.payment, JSON.stringify(data));

    log.info('支付订单已缓存', { client_sn: clientSn });
  } catch (error) {
    log.error('缓存支付订单失败', error as Error);
    throw error;
  }
}

/**
 * 获取缓存的支付订单信息
 */
export async function getCachedPaymentOrder(clientSn: string): Promise<PaymentOrderData | null> {
  try {
    const client = await getRedisClient();
    const key = CACHE_KEYS.payment(clientSn);

    const data = await client.get(key);
    if (!data) {
      return null;
    }

    return JSON.parse(data.toString()) as PaymentOrderData;
  } catch (error) {
    log.error('获取缓存支付订单失败', error as Error);
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
    log.error('删除终端信息失败', error as Error);
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
    log.error('缓存清理失败', error as Error);
  }
}

/**
 * 安全执行 Redis 操作，带重试机制
 */
async function safeRedisOperation<T>(operation: (client: ReturnType<typeof createClient>) => Promise<T>): Promise<T> {
  let lastError: Error | unknown;

  // 执行健康检查
  await performHealthCheck();

  // 减少重试次数，避免过度重试
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const client = await getRedisClient();

      // 确保客户端存在且已连接
      if (!client || !client.isReady) {
        throw new Error('Redis 客户端未就绪');
      }

      return await operation(client);
    } catch (error) {
      lastError = error;
      const errorMsg = (error as Error).message;
      log.warn(`Redis 操作失败，尝试 ${attempt}/2`, { error: errorMsg });

      // 只在连接错误时重置连接状态
      if (errorMsg.includes('ECONNREFUSED') ||
          errorMsg.includes('ETIMEDOUT') ||
          errorMsg.includes('Connection closed') ||
          errorMsg.includes('未就绪')) {
        log.info('Redis 连接错误，重置连接状态');
        redisClient = null;
        isConnecting = false;
      }

      if (attempt < 2) {
        // 固定延迟1秒
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError;
}

/**
 * 关闭 Redis 连接
 */
export async function closeRedisConnection(): Promise<void> {
  isConnecting = false;
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      log.info('Redis 连接已关闭');
    } catch (error) {
      log.error('关闭 Redis 连接失败', error as Error);
      redisClient = null;
    }
  }
}

/**
 * 主动健康检查，维护连接活跃
 */
async function performHealthCheck(): Promise<void> {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return; // 还未到检查时间
  }

  lastHealthCheck = now;

  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.ping();
      log.debug('Redis 健康检查通过');
    }
  } catch (error) {
    log.warn('Redis 健康检查失败', { error: (error as Error).message });
    // 健康检查失败，重置连接
    redisClient = null;
    isConnecting = false;
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
    // 快速检查现有连接
    if (redisClient && redisClient.isReady) {
      try {
        await Promise.race([
          redisClient.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 3000))
        ]);
        return { connected: true };
      } catch (pingError) {
        log.warn('Redis ping 失败，尝试重新连接', { error: (pingError as Error).message });
        // ping 失败，继续尝试获取新连接
      }
    }

    // 如果正在连接中，等待一下
    if (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (redisClient && redisClient.isReady) {
        return { connected: true };
      }
    }

    // 尝试获取新连接
    try {
      const client = await getRedisClient();

      // 确保客户端存在且已连接
      if (!client || !client.isReady) {
        return {
          connected: false,
          error: 'Redis 客户端未就绪'
        };
      }

      await Promise.race([
        client.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 3000))
      ]);
      return { connected: true };
    } catch (connectError) {
      return {
        connected: false,
        error: `连接失败: ${(connectError as Error).message}`
      };
    }
  } catch (error) {
    return {
      connected: false,
      error: (error as Error).message
    };
  }
}
