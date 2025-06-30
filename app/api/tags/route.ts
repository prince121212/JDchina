import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { getAllTags, getPopularTags, createTag, getTagByName } from "@/models/tag";

// GET /api/tags - 获取标签列表
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all'; // all, popular
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200); // 最大200条
    const search = searchParams.get('search');

    log.info("获取标签列表", { type, limit, search });

    let tags;
    
    if (type === 'popular') {
      tags = await getPopularTags(limit);
    } else {
      tags = await getAllTags();
      
      // 搜索过滤
      if (search) {
        tags = tags.filter(tag => 
          tag.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // 限制数量
      if (tags.length > limit) {
        tags = tags.slice(0, limit);
      }
    }

    return respData({
      tags,
      total: tags.length,
      type,
      limit
    });

  } catch (error) {
    log.error("获取标签列表失败", error as Error);
    return respErr("获取标签列表失败");
  }
}

// POST /api/tags - 创建新标签
export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const body = await req.json();
    const {
      name,
      color
    } = body;

    // 验证必填字段
    if (!name?.trim()) {
      return respInvalidParams("标签名称不能为空");
    }

    // 验证名称长度
    if (name.trim().length > 20) {
      return respInvalidParams("标签名称不能超过20个字符");
    }

    // 验证名称格式（只允许中文、英文、数字、下划线、连字符）
    const namePattern = /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/;
    if (!namePattern.test(name.trim())) {
      return respInvalidParams("标签名称只能包含中文、英文、数字、下划线和连字符");
    }

    // 检查标签是否已存在
    const existingTag = await getTagByName(name.trim());
    if (existingTag) {
      return respData({
        tag: existingTag,
        message: "标签已存在",
        existed: true
      });
    }

    // 验证颜色格式
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return respInvalidParams("颜色格式不正确，请使用十六进制格式（如：#FF0000）");
    }

    // 创建标签对象
    const tag = {
      name: name.trim(),
      color: color?.trim() || null,
      usage_count: 0,
    };

    log.info("创建标签", { 
      name: tag.name, 
      color: tag.color,
      user_uuid 
    });

    const createdTag = await createTag(tag);

    log.info("标签创建成功", { 
      tagId: createdTag.id, 
      name: tag.name 
    });

    return respData({
      tag: createdTag,
      message: "标签创建成功",
      existed: false
    });

  } catch (error) {
    log.error("创建标签失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });

    // 根据错误类型返回更具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return respErr("标签名称已存在");
      }
    }

    return respErr("创建标签失败，请稍后再试");
  }
}
