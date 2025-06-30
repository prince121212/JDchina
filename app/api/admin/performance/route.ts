import { respData, respErr, respUnauthorized } from "@/lib/resp";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { dbPerformanceMonitor } from "@/lib/db-performance";

// GET /api/admin/performance - 获取数据库性能统计
export async function GET(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    // 检查管理员权限
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return respUnauthorized("无管理员权限");
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      // 重置性能统计
      dbPerformanceMonitor.resetStats();
      log.info("数据库性能统计已重置", { user_uuid });
      
      return respData({
        message: "性能统计已重置"
      });
    }

    // 获取性能统计信息
    const stats = dbPerformanceMonitor.getQueryStats();
    const report = dbPerformanceMonitor.getPerformanceReport();

    log.info("获取数据库性能统计", { 
      user_uuid,
      totalQueries: report.totalQueries,
      slowQueriesCount: report.slowQueries.length
    });

    return respData({
      stats,
      report,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log.error("获取数据库性能统计失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/admin/performance"
    });

    return respErr("获取性能统计失败，请稍后再试");
  }
}

// POST /api/admin/performance - 执行性能操作
export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    // 检查管理员权限
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return respUnauthorized("无管理员权限");
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'log_report':
        // 记录性能报告到日志
        dbPerformanceMonitor.logPerformanceReport();
        log.info("性能报告已记录到日志", { user_uuid });
        
        return respData({
          message: "性能报告已记录到日志"
        });

      case 'reset_stats':
        // 重置统计信息
        dbPerformanceMonitor.resetStats();
        log.info("数据库性能统计已重置", { user_uuid });
        
        return respData({
          message: "性能统计已重置"
        });

      default:
        return respErr("不支持的操作");
    }

  } catch (error) {
    log.error("执行性能操作失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/admin/performance"
    });

    return respErr("执行操作失败，请稍后再试");
  }
}
