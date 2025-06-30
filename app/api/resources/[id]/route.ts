import { respData, respErr, respInvalidParams, respUnauthorized, respNotFound } from "@/lib/resp";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { findResourceByUuid, deleteResource, incrementResourceAccess } from "@/models/resource";
import { getResourceTags } from "@/models/tag";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/resources/[id] - 获取单个资源详情
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 验证资源ID
    if (!id || id.trim().length === 0) {
      return respInvalidParams("资源ID不能为空");
    }

    // 验证UUID格式（简单验证）
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id.trim())) {
      return respInvalidParams("资源ID格式不正确");
    }

    const resourceId = id.trim();
    log.info("获取资源详情", { resourceId });

    const resource = await findResourceByUuid(resourceId);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    // 获取资源标签
    if (resource.id) {
      const tags = await getResourceTags(resource.id);
      resource.tags = tags.filter(tag => tag.id !== undefined).map(tag => ({
        id: tag.id!,
        name: tag.name,
        color: tag.color
      }));
    }

    // 增加访问次数（异步执行，不影响响应）
    if (resource.id) {
      incrementResourceAccess(resourceId).catch(error => {
        log.warn("更新访问次数失败", { error: error as Error, resourceId });
      });
    }

    log.info("资源详情获取成功", { resourceId, title: resource.title });

    return respData({ resource });

  } catch (error) {
    log.error("获取资源详情失败", error as Error, { resourceId: await params.then(p => p.id) });
    return respErr("获取资源详情失败");
  }
}



// DELETE /api/resources/[id] - 删除资源
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { id } = await params;
    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    // 检查资源是否存在
    const existingResource = await findResourceByUuid(id);
    if (!existingResource) {
      return respNotFound("资源不存在");
    }

    // 检查权限（只有作者或管理员可以删除）
    const isAdmin = await isUserAdmin();

    if (existingResource.author_id !== user_uuid && !isAdmin) {
      return respUnauthorized("无权限删除此资源");
    }

    log.info("删除资源", { 
      resourceId: id, 
      title: existingResource.title,
      user_uuid 
    });

    // 删除资源
    await deleteResource(id);

    log.info("资源删除成功", { resourceId: id, title: existingResource.title });

    return respData({
      message: "资源删除成功"
    });

  } catch (error) {
    log.error("删除资源失败", error as Error, {
      resourceId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });

    return respErr("删除资源失败，请稍后再试");
  }
}
