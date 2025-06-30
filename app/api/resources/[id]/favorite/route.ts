import { respData, respErr, respInvalidParams, respUnauthorized, respNotFound } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { findResourceByUuid } from "@/models/resource";
import { toggleFavorite, isFavorited } from "@/models/favorite";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/resources/[id]/favorite - 切换收藏状态
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { id } = await params;
    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    log.info("切换资源收藏状态", { resourceId: id, user_uuid });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    if (!resource.id) {
      return respErr("资源数据异常");
    }

    // 切换收藏状态
    const result = await toggleFavorite(user_uuid, resource.id);

    const message = result.action === 'added' ? '收藏成功' : '已取消收藏';
    const favorited = result.action === 'added';

    log.info("收藏状态切换成功", { 
      resourceId: id, 
      title: resource.title,
      user_uuid,
      action: result.action
    });

    return respData({
      message,
      favorited,
      action: result.action,
      resource: {
        uuid: resource.uuid,
        title: resource.title
      }
    });

  } catch (error) {
    log.error("切换收藏状态失败", error as Error, {
      resourceId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });

    return respErr("操作失败，请稍后再试");
  }
}

// DELETE /api/resources/[id]/favorite - 取消收藏
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { id } = await params;
    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    log.info("取消资源收藏", { resourceId: id, user_uuid });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    if (!resource.id) {
      return respErr("资源数据异常");
    }

    // 检查是否已收藏
    const favorited = await isFavorited(user_uuid, resource.id);
    if (!favorited) {
      return respData({
        message: "资源未收藏",
        favorited: false
      });
    }

    // 取消收藏
    const result = await toggleFavorite(user_uuid, resource.id);

    log.info("取消收藏成功", { 
      resourceId: id, 
      title: resource.title,
      user_uuid
    });

    return respData({
      message: "已取消收藏",
      favorited: false,
      action: result.action,
      resource: {
        uuid: resource.uuid,
        title: resource.title
      }
    });

  } catch (error) {
    log.error("取消收藏失败", error as Error, {
      resourceId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });

    return respErr("取消收藏失败，请稍后再试");
  }
}
