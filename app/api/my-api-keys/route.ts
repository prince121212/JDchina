import { respData, respErr, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { getUserApikeys } from "@/models/apikey";

// GET /api/my-api-keys - 获取当前用户的API密钥列表
export async function GET(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // 最大100条

    log.info("获取用户API密钥列表", { user_uuid, page, limit });

    const apiKeys = await getUserApikeys(user_uuid, page, limit);

    return respData({
      apiKeys: apiKeys || [],
      total: apiKeys?.length || 0,
      page,
      limit
    });

  } catch (error) {
    log.error("获取用户API密钥列表失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/my-api-keys"
    });

    return respErr("获取API密钥列表失败，请稍后再试");
  }
}
