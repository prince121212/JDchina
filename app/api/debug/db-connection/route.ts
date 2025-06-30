import { respData, respErr } from "@/lib/resp";
import { getConnectionStats, checkDatabaseHealth, resetSupabaseClient } from "@/models/db";
import { log } from "@/lib/logger";
import { isUserAdmin } from "@/services/user";

/**
 * 检查调试API访问权限
 */
async function checkDebugAccess(): Promise<{ allowed: boolean; reason?: string }> {
  // 生产环境需要管理员权限
  if (process.env.NODE_ENV === 'production') {
    try {
      const isAdmin = await isUserAdmin();
      if (!isAdmin) {
        return { allowed: false, reason: "生产环境仅限管理员访问" };
      }
    } catch (error) {
      return { allowed: false, reason: "权限验证失败" };
    }
  }

  // 开发环境允许访问，但记录日志
  if (process.env.NODE_ENV === 'development') {
    log.warn("调试API被访问", {
      endpoint: "/api/debug/db-connection",
      environment: "development",
      timestamp: new Date().toISOString()
    });
  }

  return { allowed: true };
}

export async function GET() {
  try {
    // 检查访问权限
    const accessCheck = await checkDebugAccess();
    if (!accessCheck.allowed) {
      log.warn("调试API访问被拒绝", {
        reason: accessCheck.reason,
        endpoint: "/api/debug/db-connection"
      });
      return respErr(accessCheck.reason || "访问被拒绝", 403);
    }

    log.info("获取数据库连接调试信息", { endpoint: "/api/debug/db-connection" });

    // 获取连接统计信息
    const connectionStats = getConnectionStats();

    // 执行健康检查
    const health = await checkDatabaseHealth();

    const debugInfo = {
      connection: connectionStats,
      health: {
        healthy: health.healthy,
        latency: health.latency,
        error: health.error,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        tlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
      },
      recommendations: [] as string[],
      timestamp: new Date().toISOString(),
    };

    // 添加建议
    if (!health.healthy) {
      debugInfo.recommendations.push("数据库连接异常，建议检查网络连接和 Supabase 配置");
    }
    
    if (health.latency && health.latency > 5000) {
      debugInfo.recommendations.push("数据库延迟较高，建议检查网络质量");
    }
    
    // 注释掉connectionAttempts相关代码，因为getConnectionStats()中没有这个属性
    // if (connectionStats.connectionAttempts > 5) {
    //   debugInfo.recommendations.push("连接重试次数较多，建议检查网络稳定性");
    // }

    log.info("数据库连接调试信息获取完成", {
      healthy: health.healthy,
      latency: health.latency,
      // connectionAttempts: connectionStats.connectionAttempts,
      endpoint: "/api/debug/db-connection"
    });

    return respData(debugInfo);
  } catch (e) {
    log.error("获取数据库连接调试信息失败", e as Error, { endpoint: "/api/debug/db-connection" });
    return respErr("获取调试信息失败");
  }
}

export async function POST(req: Request) {
  try {
    // 检查访问权限
    const accessCheck = await checkDebugAccess();
    if (!accessCheck.allowed) {
      log.warn("调试API访问被拒绝", {
        reason: accessCheck.reason,
        endpoint: "/api/debug/db-connection",
        method: "POST"
      });
      return respErr(accessCheck.reason || "访问被拒绝", 403);
    }

    const { action } = await req.json();

    if (action === 'reset') {
      log.info("手动重置数据库连接", { endpoint: "/api/debug/db-connection" });

      resetSupabaseClient();
      const stats = getConnectionStats();

      return respData({
        message: "数据库连接已重置",
        stats,
        timestamp: new Date().toISOString(),
      });
    }

    return respErr("不支持的操作");
  } catch (e) {
    log.error("重置数据库连接失败", e as Error, { endpoint: "/api/debug/db-connection" });
    return respErr("重置连接失败");
  }
}
