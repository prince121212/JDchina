import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { getResourcesList, getResourcesCount, insertResource } from "@/models/resource";
import { addResourceTags } from "@/models/tag";
import { findCategoryByName } from "@/models/category";
import { getUuid } from "@/lib/hash";
import { ResourceUploadForm } from "@/types/resource";

// GET /api/resources - 获取资源列表
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 输入验证和清理
    const rawOffset = searchParams.get('offset');
    const rawLimit = searchParams.get('limit');
    const rawCategory = searchParams.get('category');
    const rawTags = searchParams.get('tags');
    const rawSearch = searchParams.get('search');
    const rawSort = searchParams.get('sort');
    const rawStatus = searchParams.get('status');

    // 验证和处理offset
    let offset = 0;
    if (rawOffset) {
      const parsedOffset = parseInt(rawOffset);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return respInvalidParams("offset参数必须是非负整数");
      }
      offset = parsedOffset;
    }

    // 验证和处理limit
    let limit = 20;
    if (rawLimit) {
      const parsedLimit = parseInt(rawLimit);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return respInvalidParams("limit参数必须是正整数");
      }
      limit = Math.min(parsedLimit, 100); // 最大100条
    }

    // 验证和处理分类参数（支持ID或名称）
    let category: string | undefined;
    if (rawCategory) {
      const parsedCategory = parseInt(rawCategory);
      if (!isNaN(parsedCategory) && parsedCategory > 0) {
        // 如果是有效的数字，直接使用
        category = rawCategory;
      } else {
        // 如果不是数字，尝试通过分类名称查找ID
        try {
          const categoryRecord = await findCategoryByName(rawCategory.trim());
          if (categoryRecord && categoryRecord.id) {
            category = categoryRecord.id.toString();
          } else {
            return respInvalidParams(`分类"${rawCategory}"不存在`);
          }
        } catch (error) {
          log.error("查找分类失败", error as Error, { categoryName: rawCategory });
          return respInvalidParams("分类参数格式错误");
        }
      }
    }

    // 验证和处理标签
    let tags: string[] | undefined;
    if (rawTags) {
      const tagList = rawTags.split(',').filter(Boolean).map(tag => tag.trim());
      // 验证标签格式
      const invalidTags = tagList.filter(tag =>
        !tag || tag.length > 50 || !/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(tag)
      );
      if (invalidTags.length > 0) {
        return respInvalidParams("标签格式不正确，只能包含中文、英文、数字、下划线和连字符，且长度不超过50字符");
      }
      tags = tagList.length > 0 ? tagList : undefined;
    }

    // 验证和处理搜索词
    let search: string | undefined;
    if (rawSearch) {
      const trimmedSearch = rawSearch.trim();
      if (trimmedSearch.length > 100) {
        return respInvalidParams("搜索词长度不能超过100字符");
      }
      // 过滤危险字符
      const dangerousChars = /[<>'"&;]/;
      if (dangerousChars.test(trimmedSearch)) {
        return respInvalidParams("搜索词包含不允许的字符");
      }
      search = trimmedSearch.length > 0 ? trimmedSearch : undefined;
    }

    // 验证排序参数
    const validSorts = ['latest', 'popular', 'rating', 'views'];
    const sort = rawSort && validSorts.includes(rawSort) ? rawSort : 'latest';

    // 验证状态参数
    const validStatuses = ['pending', 'approved', 'rejected'];
    const status = rawStatus && validStatuses.includes(rawStatus) ? rawStatus : undefined;

    const params = {
      category,
      tags,
      search,
      sort,
      status,
      offset,
      limit,
    };

    log.info("获取资源列表", params);

    // 并行获取资源列表和总数
    const [resources, totalCount] = await Promise.all([
      getResourcesList(params),
      getResourcesCount({
        category: params.category,
        tags: params.tags,
        search: params.search,
        status: params.status
      })
    ]);

    return respData({
      resources,
      total: totalCount,
      offset: params.offset,
      limit: params.limit
    });

  } catch (error) {
    log.error("获取资源列表失败", error as Error, {
      url: req.url,
      method: req.method
    });

    // 根据错误类型返回不同的响应
    if (error instanceof Error) {
      if (error.message.includes('invalid input syntax')) {
        return respInvalidParams("请求参数格式错误");
      }
      if (error.message.includes('connection')) {
        return respErr("数据库连接失败，请稍后再试");
      }
    }

    return respErr("获取资源列表失败，请稍后再试");
  }
}

// POST /api/resources - 创建新资源
export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const body = await req.json();
    const {
      title,
      description,
      content,
      file_url,

      category_id,
      tags,
      is_free,
      credits
    }: Partial<ResourceUploadForm & {
      file_url: string;
    }> = body;

    // 验证必填字段
    if (!title?.trim()) {
      return respInvalidParams("资源标题不能为空");
    }
    if (!description?.trim()) {
      return respInvalidParams("资源描述不能为空");
    }
    if (!category_id) {
      return respInvalidParams("请选择资源分类");
    }
    if (!file_url) {
      return respInvalidParams("文件URL不能为空");
    }


    // 验证标题长度
    if (title.trim().length > 100) {
      return respInvalidParams("资源标题不能超过100个字符");
    }

    // 验证描述长度
    if (description.trim().length > 500) {
      return respInvalidParams("资源描述不能超过500个字符");
    }

    // 验证内容长度
    if (content && content.trim().length > 2000) {
      return respInvalidParams("详细内容不能超过2000个字符");
    }

    // 验证积分
    if (!is_free && (!credits || credits <= 0)) {
      return respInvalidParams("付费资源请设置正确的积分数量");
    }

    // 验证标签数量
    if (tags && tags.length > 10) {
      return respInvalidParams("最多只能添加10个标签");
    }

    const resourceUuid = getUuid();

    // 创建资源对象
    const resource = {
      uuid: resourceUuid,
      title: title.trim(),
      description: description.trim(),
      content: content?.trim() || undefined,
      file_url,
      category_id,
      author_id: user_uuid,
      status: 'pending' as const, // 默认待审核
      rating_avg: 0,
      rating_count: 0,
      view_count: 0,
      access_count: 0,
      is_featured: false,
      is_free: is_free ?? true,
      credits: is_free ? 0 : (credits || 0),
    };

    log.info("创建资源", {
      resourceUuid,
      title: resource.title,
      author_id: user_uuid,
      category_id,
      is_free: resource.is_free,
      credits: resource.credits
    });

    // 插入资源
    const createdResource = await insertResource(resource);

    // 添加标签
    if (tags && tags.length > 0 && createdResource.id) {
      await addResourceTags(createdResource.id, tags);
      log.info("资源标签添加成功", { resourceId: createdResource.id, tags });
    }

    log.info("资源创建成功", { 
      resourceId: createdResource.id, 
      resourceUuid,
      title: resource.title 
    });

    return respData({
      resource: {
        uuid: resourceUuid,
        title: resource.title,
        status: resource.status,
        message: "资源上传成功，审核通过后将公开显示"
      }
    });

  } catch (error) {
    log.error("创建资源失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });

    // 根据错误类型返回更具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes('category_id')) {
        return respErr("无效的分类ID");
      }
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return respErr("资源已存在");
      }
    }

    return respErr("创建资源失败，请稍后再试");
  }
}
