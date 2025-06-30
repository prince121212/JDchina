import { respData, respErr, respUnauthorized, respInvalidParams, respNotFound } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { findResourceByUuid } from "@/models/resource";
import { addResourceRating, getUserResourceRating } from "@/models/rating";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/resources/[id]/rating - 获取用户对资源的评分
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { id } = await params;
    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    log.info("获取用户资源评分", { resourceId: id, user_uuid });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    if (!resource.id) {
      return respErr("资源数据异常");
    }

    // 获取用户评分
    const rating = await getUserResourceRating(user_uuid, resource.id);

    return respData({
      rating: rating?.rating || 0,
      hasRated: !!rating,
      ratedAt: rating?.created_at
    });

  } catch (error) {
    log.error("获取用户资源评分失败", error as Error, {
      resourceId: (await params).id,
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });
    return respErr("获取评分失败");
  }
}

// POST /api/resources/[id]/rating - 添加或更新资源评分
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

    const body = await req.json();
    const { rating } = body;

    // 验证评分值
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return respInvalidParams("评分必须是1-5之间的整数");
    }

    log.info("添加资源评分", { resourceId: id, user_uuid, rating });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    if (!resource.id) {
      return respErr("资源数据异常");
    }

    // 添加或更新评分
    const result = await addResourceRating({
      user_uuid,
      resource_id: resource.id,
      rating
    });

    log.info("资源评分成功", { 
      resourceId: id, 
      user_uuid, 
      rating,
      ratingId: result.id
    });

    return respData({
      message: "评分成功",
      rating,
      ratedAt: result.created_at
    });

  } catch (error) {
    log.error("添加资源评分失败", error as Error, {
      resourceId: (await params).id,
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });
    return respErr("评分失败");
  }
}
