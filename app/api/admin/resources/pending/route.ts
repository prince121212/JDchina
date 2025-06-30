import { respData, respErr, respUnauthorized } from "@/lib/resp";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { getResourcesList } from "@/models/resource";

// GET /api/admin/resources/pending - 获取待审核资源列表
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
    
    const params = {
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || 'latest',
      status: 'pending', // 固定为待审核状态
      offset: parseInt(searchParams.get('offset') || '0'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // 最大100条
    };

    log.info("获取待审核资源列表", { user_uuid, ...params });

    const resources = await getResourcesList(params);

    return respData({
      resources,
      total: resources.length,
      offset: params.offset,
      limit: params.limit
    });

  } catch (error) {
    log.error("获取待审核资源列表失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/admin/resources/pending"
    });

    return respErr("获取待审核资源列表失败，请稍后再试");
  }
}
