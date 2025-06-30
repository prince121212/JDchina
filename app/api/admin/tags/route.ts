import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { createTag, getAllTags } from "@/models/tag";

// GET /api/admin/tags - 获取标签列表
export async function GET(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    // 检查管理员权限
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return respUnauthorized("无管理员权限");
    }

    log.info("获取标签列表", { user_uuid });

    const tags = await getAllTags();

    return respData({
      tags,
      total: tags.length
    });

  } catch (error) {
    log.error("获取标签列表失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/admin/tags"
    });

    return respErr("获取标签列表失败，请稍后再试");
  }
}

// POST /api/admin/tags - 创建标签
export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    // 检查管理员权限
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return respUnauthorized("无管理员权限");
    }

    const body = await req.json().catch(() => ({}));
    const { name, color } = body;

    if (!name || !name.trim()) {
      return respInvalidParams("标签名称不能为空");
    }

    log.info("创建标签", { name, user_uuid });

    const tagData = {
      name: name.trim(),
      color: color?.trim() || undefined,
      usage_count: 0
    };

    const tag = await createTag(tagData);

    log.info("标签创建成功", { 
      tagId: tag.id, 
      name: tag.name,
      user_uuid 
    });

    return respData({
      message: "标签创建成功",
      tag
    });

  } catch (error) {
    log.error("创建标签失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/admin/tags"
    });

    return respErr("创建标签失败，请稍后再试");
  }
}
