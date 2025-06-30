import { respData, respErr, respUnauthorized, respInvalidParams, respNotFound } from "@/lib/resp";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { getTagById, updateTag, deleteTag } from "@/models/tag";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/admin/tags/[id] - 获取标签详情
export async function GET(req: Request, { params }: RouteParams) {
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

    const { id } = await params;
    const tagId = parseInt(id);
    
    if (!tagId || tagId <= 0) {
      return respInvalidParams("无效的标签ID");
    }

    log.info("获取标签详情", { tagId, user_uuid });

    const tag = await getTagById(tagId);
    if (!tag) {
      return respNotFound("标签不存在");
    }

    return respData({ tag });

  } catch (error) {
    log.error("获取标签详情失败", error as Error, {
      tagId: (await params).id,
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });
    return respErr("获取标签详情失败");
  }
}

// PUT /api/admin/tags/[id] - 更新标签
export async function PUT(req: Request, { params }: RouteParams) {
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

    const { id } = await params;
    const tagId = parseInt(id);
    
    if (!tagId || tagId <= 0) {
      return respInvalidParams("无效的标签ID");
    }

    // 检查标签是否存在
    const existingTag = await getTagById(tagId);
    if (!existingTag) {
      return respNotFound("标签不存在");
    }

    const body = await req.json();
    const { name, color } = body;

    // 验证字段
    if (name !== undefined) {
      if (!name.trim()) {
        return respInvalidParams("标签名称不能为空");
      }
      if (name.trim().length > 50) {
        return respInvalidParams("标签名称不能超过50个字符");
      }
    }

    if (color !== undefined && color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return respInvalidParams("颜色格式不正确，请使用十六进制格式如 #FF0000");
    }

    // 构建更新对象
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;

    log.info("更新标签", { 
      tagId, 
      updateFields: Object.keys(updateData),
      user_uuid 
    });

    // 更新标签
    await updateTag(tagId, updateData);

    log.info("标签更新成功", { tagId, name: updateData.name || existingTag.name });

    return respData({
      message: "标签更新成功",
      tag: {
        id: tagId,
        name: updateData.name || existingTag.name
      }
    });

  } catch (error) {
    log.error("更新标签失败", error as Error, {
      tagId: (await params).id,
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });
    return respErr("更新标签失败");
  }
}

// DELETE /api/admin/tags/[id] - 删除标签
export async function DELETE(req: Request, { params }: RouteParams) {
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

    const { id } = await params;
    const tagId = parseInt(id);
    
    if (!tagId || tagId <= 0) {
      return respInvalidParams("无效的标签ID");
    }

    // 检查标签是否存在
    const existingTag = await getTagById(tagId);
    if (!existingTag) {
      return respNotFound("标签不存在");
    }

    log.info("删除标签", { 
      tagId, 
      name: existingTag.name,
      user_uuid 
    });

    // 删除标签
    await deleteTag(tagId);

    log.info("标签删除成功", { tagId, name: existingTag.name });

    return respData({
      message: "标签删除成功"
    });

  } catch (error) {
    log.error("删除标签失败", error as Error, {
      tagId: (await params).id,
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });
    return respErr("删除标签失败");
  }
}
