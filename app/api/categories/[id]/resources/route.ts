import { respData, respErr, respInvalidParams, respNotFound } from "@/lib/resp";
import { log } from "@/lib/logger";
import { findCategoryById } from "@/models/category";
import { getResourcesList } from "@/models/resource";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/categories/[id]/resources - 获取分类下的资源列表
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    
    if (!categoryId || categoryId <= 0) {
      return respInvalidParams("无效的分类ID");
    }

    // 检查分类是否存在
    const category = await findCategoryById(categoryId);
    if (!category) {
      return respNotFound("分类不存在");
    }

    const { searchParams } = new URL(req.url);
    
    const resourceParams = {
      category: categoryId.toString(),
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || 'latest',
      status: 'approved', // 只显示已审核通过的资源
      offset: parseInt(searchParams.get('offset') || '0'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // 最大100条
    };

    log.info("获取分类下的资源列表", { categoryId, categoryName: category.name, ...resourceParams });

    const resources = await getResourcesList(resourceParams);

    return respData({
      category: {
        id: category.id,
        name: category.name,
        description: category.description
      },
      resources,
      total: resources.length,
      offset: resourceParams.offset,
      limit: resourceParams.limit
    });

  } catch (error) {
    log.error("获取分类下的资源列表失败", error as Error, {
      categoryId: (await params).id
    });
    return respErr("获取分类资源列表失败");
  }
}
