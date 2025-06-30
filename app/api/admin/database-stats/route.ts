import { respData, respErr } from "@/lib/resp";
import { getUserEmail } from "@/services/user";
import { log } from "@/lib/logger";
import { getSupabaseClient } from "@/models/db";

// GET /api/admin/database-stats - 获取数据库统计信息
export async function GET() {
  try {
    const user_email = await getUserEmail();
    
    // 检查管理员权限
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
    const isAdmin = adminEmails.includes(user_email);

    if (!isAdmin) {
      return respErr("权限不足", 403);
    }

    log.info("获取数据库统计信息", { admin: user_email });

    const supabase = getSupabaseClient();

    // 并发获取各种统计数据
    const [resourcesResult, categoriesResult, tagsResult, usersResult] = await Promise.all([
      supabase.from("resources").select("*", { count: 'exact', head: true }),
      supabase.from("categories").select("*", { count: 'exact', head: true }),
      supabase.from("tags").select("*", { count: 'exact', head: true }),
      supabase.from("users").select("*", { count: 'exact', head: true })
    ]);

    // 检查是否有错误
    if (resourcesResult.error) {
      log.error("获取资源统计失败", resourcesResult.error);
    }
    if (categoriesResult.error) {
      log.error("获取分类统计失败", categoriesResult.error);
    }
    if (tagsResult.error) {
      log.error("获取标签统计失败", tagsResult.error);
    }
    if (usersResult.error) {
      log.error("获取用户统计失败", usersResult.error);
    }

    const stats = {
      resources: resourcesResult.count || 0,
      categories: categoriesResult.count || 0,
      tags: tagsResult.count || 0,
      users: usersResult.count || 0
    };

    log.info("数据库统计信息获取成功", stats);

    return respData({
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log.error("获取数据库统计信息失败", error as Error);
    return respErr("获取数据库统计信息失败");
  }
}
