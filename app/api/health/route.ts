import { respData, respErr } from "@/lib/resp";
import { checkDatabaseHealth } from "@/models/db";
import { log } from "@/lib/logger";

/**
 * 统一的健康检查端点
 * - 生产环境：基础健康状态，适合监控系统
 * - 开发环境：包含延迟信息，便于调试
 */
export async function GET() {
  try {
    const health = await checkDatabaseHealth();

    if (health.healthy) {
      const response: any = {
        status: "healthy",
        timestamp: new Date().toISOString()
      };

      // 开发环境提供更多信息
      if (process.env.NODE_ENV === 'development') {
        response.latency = health.latency;
        response.environment = "development";
      }

      log.info("健康检查正常", {
        latency: health.latency,
        endpoint: "/api/health"
      });

      return respData(response);
    } else {
      // 生产环境不暴露具体错误信息
      const errorMessage = process.env.NODE_ENV === 'production'
        ? "服务暂时不可用"
        : `数据库连接失败: ${health.error}`;

      log.error("健康检查失败", undefined, {
        error: health.error,
        endpoint: "/api/health"
      });

      return respErr(errorMessage, 503);
    }
  } catch (e) {
    log.error("健康检查异常", e as Error, { endpoint: "/api/health" });

    const errorMessage = process.env.NODE_ENV === 'production'
      ? "服务暂时不可用"
      : "健康检查失败";

    return respErr(errorMessage, 503);
  }
}
