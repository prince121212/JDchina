import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { getUserFavorites, addFavorite, removeFavorite, isFavorited } from "@/models/favorite";

// GET /api/favorites - 获取用户收藏列表
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
    });
    return respErr("获取收藏列表失败");
  }
}

// POST /api/favorites - 添加收藏
export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const body = await req.json();
    const { resource_id } = body;

    // 验证参数
    if (!resource_id) {
      return respInvalidParams("资源ID不能为空");
    }

    if (typeof resource_id !== 'number' || resource_id <= 0) {
      return respInvalidParams("无效的资源ID");
    }

    log.info("添加收藏", { user_uuid, resource_id });

    // 检查是否已收藏
    const alreadyFavorited = await isFavorited(user_uuid, resource_id);
    if (alreadyFavorited) {
      return respData({
        message: "已经收藏过此资源",
        favorited: true
      });
    }

    // 添加收藏
    const favorite = await addFavorite({
      user_uuid,
      resource_id
    });

    log.info("收藏添加成功", { 
      favoriteId: favorite.id, 
      user_uuid, 
      resource_id 
    });

    return respData({
      favorite,
      message: "收藏成功",
      favorited: true
    });

  } catch (error) {
    log.error("添加收藏失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });

    // 根据错误类型返回更具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes('resource_id') || error.message.includes('foreign key')) {
        return respErr("资源不存在");
      }
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return respData({
          message: "已经收藏过此资源",
          favorited: true
        });
      }
    }

    return respErr("收藏失败，请稍后再试");
  }
}
