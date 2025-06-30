import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or key is not set");
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });

  return supabaseClient;
}

// 重置数据库连接（仅用于调试）
export function resetSupabaseClient() {
  supabaseClient = null;
  return getSupabaseClient();
}

// 获取连接统计信息（仅用于调试）
export function getConnectionStats() {
  return {
    hasClient: !!supabaseClient,
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  };
}

// 判断是否为可重试的网络错误
function isRetryableNetworkError(error: any): boolean {
  if (!error?.message) return false;

  const message = error.message.toLowerCase();
  return message.includes('fetch failed') ||
         message.includes('network') ||
         message.includes('timeout') ||
         message.includes('econnreset') ||
         message.includes('enotfound');
}

// 重试工具函数 - 使用指数退避策略
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // 如果还有重试机会且是网络错误，则重试
      if (attempt < maxAttempts && isRetryableNetworkError(error)) {
        // 指数退避：1s, 2s, 4s，最大10s
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        log.warn(`网络错误，${delay}ms后重试`, {
          attempt,
          maxAttempts,
          function: 'withRetry',
          error: error.message,
          delay
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // 最后一次尝试失败，或者不是网络错误，直接抛出
      throw error;
    }
  }

  // 理论上不会到这里，但为了类型安全
  throw lastError;
}

// 数据库健康检查
export async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('users')
      .select('uuid')
      .limit(1)
      .single();

    const latency = Date.now() - startTime;

    // PGRST116 (not found) 也算成功，说明连接正常
    if (error && error.code !== 'PGRST116') {
      return { healthy: false, latency, error: error.message };
    }

    return { healthy: true, latency };
  } catch (error: any) {
    return { healthy: false, error: error.message };
  }
}
