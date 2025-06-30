import { respData, respErr, respInvalidParams, respNotFound } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { findResourceByUuid } from "@/models/resource";
import { isFavorited } from "@/models/favorite";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/resources/[id]/favorite-status - 检查资源收藏状态
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    // 获取用户信息（可选，未登录用户返回未收藏状态）
    const user_uuid = await getUserUuid().catch(() => null);
    
    if (!user_uuid) {
      return respData({
        favorited: false,
        message: "用户未登录"
      });
    }

    log.info("检查资源收藏状态", { resourceId: id, user_uuid });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    // 检查收藏状态
    let favorited = false;
    if (resource.id) {
      favorited = await isFavorited(user_uuid, resource.id);
    }

    return respData({
      favorited,
      resource: {
        uuid: resource.uuid,
        title: resource.title
      }
    });

  } catch (error) {
    log.error("检查资源收藏状态失败", error as Error, {
      resourceId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });

    return respErr("检查收藏状态失败");
  }
}
