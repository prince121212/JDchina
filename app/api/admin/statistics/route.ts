import { respData, respErr, respUnauthorized } from "@/lib/resp";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { getResourcesStats } from "@/models/resource";
import { getAllCategories } from "@/models/category";
import { getAllTags } from "@/models/tag";
import { getUsers } from "@/models/user";
import { getAuditLogStats } from "@/models/audit-log";

// GET /api/admin/statistics - 获取管理后台统计数据
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

    log.info("获取管理后台统计数据", { user_uuid });

    // 并行获取所有统计数据
    const [resourcesStats, categories, tags, users, auditStats] = await Promise.all([
      getResourcesStats(),
      getAllCategories(),
      getAllTags(),
      getUsers(1, 1000), // 获取用户数据用于统计
      getAuditLogStats().catch(() => ({
        total: 0,
        approved: 0,
        rejected: 0,
        todayTotal: 0,
        weekTotal: 0,
        topAdmins: []
      }))
    ]);

    // 计算额外的统计指标
    const stats = {
      resources: resourcesStats,
      categories: {
        total: categories.length,
        list: categories.slice(0, 10) // 返回前10个分类
      },
      tags: {
        total: tags.length,
        list: tags.slice(0, 10) // 返回前10个标签
      },
      users: {
        total: users?.length || 0,
        // 可以添加更多用户统计，如活跃用户数等
      },
      audit: auditStats,
      computed: {
        approvalRate: resourcesStats.total > 0 
          ? Math.round((resourcesStats.approved / resourcesStats.total) * 100) 
          : 0,
        avgViewsPerResource: resourcesStats.total > 0 
          ? Math.round(resourcesStats.totalViews / resourcesStats.total) 
          : 0,
        avgAccessPerResource: resourcesStats.total > 0
          ? Math.round(resourcesStats.totalAccess / resourcesStats.total)
          : 0,
      }
    };

    log.info("管理后台统计数据获取成功", {
      user_uuid,
      resourcesTotal: resourcesStats.total,
      usersTotal: users?.length || 0,
      categoriesTotal: categories.length
    });

    return respData(stats);

  } catch (error) {
    log.error("获取管理后台统计数据失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/admin/statistics"
    });

    return respErr("获取统计数据失败，请稍后再试");
  }
}
