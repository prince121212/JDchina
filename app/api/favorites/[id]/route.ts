import { respData, respErr, respInvalidParams, respUnauthorized, respNotFound } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { removeFavoriteById, getFavoriteById } from "@/models/favorite";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// DELETE /api/favorites/[id] - 删除收藏
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { id } = await params;
    const favoriteId = parseInt(id);

    if (!favoriteId || favoriteId <= 0) {
      return respInvalidParams("无效的收藏ID");
    }

    log.info("删除收藏", { user_uuid, favoriteId });

    // 检查收藏是否存在且属于当前用户
    const favorite = await getFavoriteById(favoriteId);
    if (!favorite) {
      return respNotFound("收藏不存在");
    }

    if (favorite.user_uuid !== user_uuid) {
      return respUnauthorized("无权限删除此收藏");
    }

    // 删除收藏
    await removeFavoriteById(favoriteId);

    log.info("收藏删除成功", { 
      favoriteId, 
      user_uuid, 
      resource_id: favorite.resource_id 
    });

    return respData({
      message: "取消收藏成功",
      favorited: false
    });

  } catch (error) {
    log.error("删除收藏失败", error as Error, {
      favoriteId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });

    return respErr("取消收藏失败，请稍后再试");
  }
}
