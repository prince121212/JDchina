import { respData, respErr, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { getUserResources } from "@/models/resource";

// GET /api/my-uploads - 获取当前用户上传的资源列表
export async function GET(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { searchParams } = new URL(req.url);
    
    const params = {
      author_id: user_uuid,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      sort: searchParams.get('sort') || 'latest',
      offset: parseInt(searchParams.get('offset') || '0'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // 最大100条
    };

    log.info("获取用户上传资源列表", { user_uuid, ...params });

    const resources = await getUserResources(params);

    // 计算统计信息
    const stats = {
      total: resources.length,
      approved: resources.filter(r => r.status === 'approved').length,
      pending: resources.filter(r => r.status === 'pending').length,
      rejected: resources.filter(r => r.status === 'rejected').length,
      totalViews: resources.reduce((sum, r) => sum + r.access_count, 0), // access_count 是真正的访问次数
    };

    return respData({
      resources,
      stats,
      offset: params.offset,
      limit: params.limit
    });

  } catch (error) {
    log.error("获取用户上传资源列表失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });
    return respErr("获取上传列表失败");
  }
}
