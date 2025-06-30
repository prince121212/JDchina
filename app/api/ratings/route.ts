import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { addResourceRating, getUserResourceRating } from "@/models/rating";

// GET /api/ratings - 获取用户评分信息
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const resource_id_param = searchParams.get('resource_id');
    const user_id_param = searchParams.get('user_id');

    // 如果提供了resource_id，获取特定资源的评分
    if (resource_id_param) {
      const user_uuid = await getUserUuid();
      if (!user_uuid) {
        return respUnauthorized("用户未登录");
      }

      const resource_id = parseInt(resource_id_param);
      if (!resource_id || resource_id <= 0) {
        return respInvalidParams("无效的资源ID");
      }

      log.info("获取用户对特定资源的评分", { user_uuid, resource_id });

      const rating = await getUserResourceRating(user_uuid, resource_id);

      return respData({
        rating: rating ? rating.rating : null,
        has_rated: !!rating,
        resource_id
      });
    }

    // 如果没有提供resource_id，返回评分系统状态信息
    log.info("获取评分系统状态");

    return respData({
      status: "active",
      message: "评分系统正常运行",
      rating_range: {
        min: 1,
        max: 5
      },
      description: "用户可以对资源进行1-5星评分",
      usage: "添加 ?resource_id=xxx 参数可获取用户对特定资源的评分"
    });

  } catch (error) {
    log.error("获取评分信息失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });
    return respErr("获取评分信息失败");
  }
}

// POST /api/ratings - 添加或更新评分
export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const body = await req.json();
    const { resource_id, rating } = body;

    // 验证参数
    if (!resource_id) {
      return respInvalidParams("资源ID不能为空");
    }

    if (typeof resource_id !== 'number' || resource_id <= 0) {
      return respInvalidParams("无效的资源ID");
    }

    if (!rating) {
      return respInvalidParams("评分不能为空");
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return respInvalidParams("评分必须在1-5之间");
    }

    log.info("添加/更新评分", { user_uuid, resource_id, rating });

    // 添加或更新评分
    const resourceRating = await addResourceRating({
      user_uuid,
      resource_id,
      rating
    });

    log.info("评分添加/更新成功", { 
      ratingId: resourceRating.id, 
      user_uuid, 
      resource_id,
      rating 
    });

    return respData({
      rating: resourceRating,
      message: "评分成功"
    });

  } catch (error) {
    log.error("添加/更新评分失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });

    // 根据错误类型返回更具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes('resource_id') || error.message.includes('foreign key')) {
        return respErr("资源不存在");
      }
      if (error.message.includes('评分必须在1-5之间')) {
        return respInvalidParams("评分必须在1-5之间");
      }
    }

    return respErr("评分失败，请稍后再试");
  }
}
