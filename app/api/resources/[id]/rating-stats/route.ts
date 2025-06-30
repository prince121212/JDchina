import { respData, respErr, respInvalidParams, respNotFound } from "@/lib/resp";
import { log } from "@/lib/logger";
import { findResourceByUuid } from "@/models/resource";
import { getResourceRatingStats } from "@/models/rating";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/resources/[id]/rating-stats - 获取资源评分统计
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    log.info("获取资源评分统计", { resourceId: id });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    if (!resource.id) {
      return respErr("资源数据异常");
    }

    // 获取评分统计
    const stats = await getResourceRatingStats(resource.id);

    return respData({
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      distribution: stats.distribution,
      resourceId: id
    });

  } catch (error) {
    log.error("获取资源评分统计失败", error as Error, {
      resourceId: (await params).id
    });
    return respErr("获取评分统计失败");
  }
}
