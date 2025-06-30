import { respData, respErr, respInvalidParams, respNotFound } from "@/lib/resp";
import { log } from "@/lib/logger";
import { getTagById } from "@/models/tag";
import { getResourcesList } from "@/models/resource";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/tags/[id]/resources - 获取标签下的资源列表
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tagId = parseInt(id);
    
    if (!tagId || tagId <= 0) {
      return respInvalidParams("无效的标签ID");
    }

    // 检查标签是否存在
    const tag = await getTagById(tagId);
    if (!tag) {
      return respNotFound("标签不存在");
    }

    const { searchParams } = new URL(req.url);
    
    const resourceParams = {
      category: searchParams.get('category') || undefined,
      tags: [tag.name], // 使用标签名称进行筛选
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || 'latest',
      status: 'approved', // 只显示已审核通过的资源
      offset: parseInt(searchParams.get('offset') || '0'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // 最大100条
    };

    log.info("获取标签下的资源列表", { tagId, tagName: tag.name, ...resourceParams });

    const resources = await getResourcesList(resourceParams);

    return respData({
      tag: {
        id: tag.id,
        name: tag.name,
        color: tag.color
      },
      resources,
      total: resources.length,
      offset: resourceParams.offset,
      limit: resourceParams.limit
    });

  } catch (error) {
    log.error("获取标签下的资源列表失败", error as Error, {
      tagId: (await params).id
    });
    return respErr("获取标签资源列表失败");
  }
}
