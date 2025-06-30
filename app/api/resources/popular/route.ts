import { respData, respErr } from "@/lib/resp";
import { log } from "@/lib/logger";
import { getPopularResources } from "@/models/resource";

// GET /api/resources/popular - 获取热门资源列表 (按访问次数排序)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // 默认10条，最大50条

    log.info("获取热门资源列表", { limit });

    const resources = await getPopularResources(limit);

    return respData({
      resources,
      total: resources.length,
      limit
    });

  } catch (error) {
    log.error("获取热门资源列表失败", error as Error);
    return respErr("获取热门资源列表失败");
  }
}
