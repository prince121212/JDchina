import { log } from "@/lib/logger";

// 数据库查询性能监控工具
export class DatabasePerformanceMonitor {
  private static instance: DatabasePerformanceMonitor;
  private queryStats: Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    maxTime: number;
    minTime: number;
  }> = new Map();

  private constructor() {}

  static getInstance(): DatabasePerformanceMonitor {
    if (!DatabasePerformanceMonitor.instance) {
      DatabasePerformanceMonitor.instance = new DatabasePerformanceMonitor();
    }
    return DatabasePerformanceMonitor.instance;
  }

  // 监控查询性能
  async monitorQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>,
    logSlowQueries: boolean = true,
    slowQueryThreshold: number = 1000 // 1秒
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFunction();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 更新统计信息
      this.updateStats(queryName, duration);

      // 记录慢查询
      if (logSlowQueries && duration > slowQueryThreshold) {
        log.warn("慢查询检测", {
          queryName,
          duration: `${duration}ms`,
          threshold: `${slowQueryThreshold}ms`
        });
      }

      // 记录查询信息
      log.debug("数据库查询完成", {
        queryName,
        duration: `${duration}ms`,
        success: true
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      log.error("数据库查询失败", error as Error, {
        queryName,
        duration: `${duration}ms`
      });

      throw error;
    }
  }

  // 更新查询统计信息
  private updateStats(queryName: string, duration: number) {
    const stats = this.queryStats.get(queryName) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      maxTime: 0,
      minTime: Infinity
    };

    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.minTime = Math.min(stats.minTime, duration);

    this.queryStats.set(queryName, stats);
  }

  // 获取查询统计信息
  getQueryStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.queryStats.forEach((value, key) => {
      stats[key] = {
        ...value,
        minTime: value.minTime === Infinity ? 0 : value.minTime
      };
    });

    return stats;
  }

  // 获取性能报告
  getPerformanceReport(): {
    totalQueries: number;
    slowQueries: Array<{ name: string; avgTime: number; count: number }>;
    topQueries: Array<{ name: string; count: number; totalTime: number }>;
  } {
    const slowQueries: Array<{ name: string; avgTime: number; count: number }> = [];
    const topQueries: Array<{ name: string; count: number; totalTime: number }> = [];
    let totalQueries = 0;

    this.queryStats.forEach((stats, name) => {
      totalQueries += stats.count;

      // 平均时间超过500ms的查询
      if (stats.avgTime > 500) {
        slowQueries.push({
          name,
          avgTime: Math.round(stats.avgTime),
          count: stats.count
        });
      }

      topQueries.push({
        name,
        count: stats.count,
        totalTime: Math.round(stats.totalTime)
      });
    });

    // 按平均时间排序慢查询
    slowQueries.sort((a, b) => b.avgTime - a.avgTime);

    // 按调用次数排序热门查询
    topQueries.sort((a, b) => b.count - a.count);

    return {
      totalQueries,
      slowQueries: slowQueries.slice(0, 10),
      topQueries: topQueries.slice(0, 10)
    };
  }

  // 重置统计信息
  resetStats() {
    this.queryStats.clear();
    log.info("数据库查询统计信息已重置");
  }

  // 记录性能报告到日志
  logPerformanceReport() {
    const report = this.getPerformanceReport();
    
    log.info("数据库性能报告", {
      totalQueries: report.totalQueries,
      slowQueriesCount: report.slowQueries.length,
      topQueriesCount: report.topQueries.length
    });

    if (report.slowQueries.length > 0) {
      log.warn("慢查询列表", { slowQueries: report.slowQueries });
    }

    log.debug("热门查询列表", { topQueries: report.topQueries });
  }
}

// 导出单例实例
export const dbPerformanceMonitor = DatabasePerformanceMonitor.getInstance();

// 装饰器函数，用于监控数据库查询
export function monitorDbQuery(queryName: string, slowQueryThreshold: number = 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return dbPerformanceMonitor.monitorQuery(
        `${target.constructor.name}.${propertyName}`,
        () => method.apply(this, args),
        true,
        slowQueryThreshold
      );
    };

    return descriptor;
  };
}

// 辅助函数：包装查询函数
export function wrapQueryWithMonitoring<T>(
  queryName: string,
  queryFunction: () => Promise<T>,
  slowQueryThreshold: number = 1000
): Promise<T> {
  return dbPerformanceMonitor.monitorQuery(
    queryName,
    queryFunction,
    true,
    slowQueryThreshold
  );
}
