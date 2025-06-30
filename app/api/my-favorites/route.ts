import { respData, respErr, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { getUserFavorites } from "@/models/favorite";

// GET /api/my-favorites - 获取当前用户收藏的资源列表
export async function GET(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { searchParams } = new URL(req.url);
    
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // 最大100条

    log.info("获取用户收藏列表", { user_uuid, offset, limit });

    const favorites = await getUserFavorites(user_uuid, offset, limit);

    return respData({
      favorites,
      total: favorites.length,
      offset,
      limit
    });

  } catch (error) {
    log.error("获取用户收藏列表失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/my-favorites"
    });

    return respErr("获取收藏列表失败，请稍后再试");
  }
}
