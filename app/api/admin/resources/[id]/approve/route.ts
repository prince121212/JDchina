import { respData, respErr, respInvalidParams, respUnauthorized, respNotFound } from "@/lib/resp";
import { getUserUuid, isUserAdmin, getUserEmail } from "@/services/user";
import { log } from "@/lib/logger";
import { findResourceByUuid, updateResource } from "@/models/resource";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/admin/resources/[id]/approve - 审核通过资源
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user_uuid = await getUserUuid();
    const user_email = await getUserEmail();

    if (!user_uuid || !user_email) {
      return respUnauthorized("用户未登录");
    }

    // 检查管理员权限
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return respUnauthorized("无管理员权限");
    }

    const { id } = await params;
    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    log.info("管理员审核资源", { resourceId: id, user_uuid, action: "approve" });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    const oldStatus = resource.status;

    // 检查资源状态
    if (resource.status === 'approved') {
      return respData({
        message: "资源已经是审核通过状态",
        resource: {
          uuid: resource.uuid,
          title: resource.title,
          status: resource.status
        }
      });
    }

    // 更新资源状态为已审核
    await updateResource(id, {
      status: 'approved',
      updated_at: new Date().toISOString()
    });

    // 审核日志功能已移除

    log.info("资源审核通过", {
      resourceId: id,
      title: resource.title,
      user_uuid
    });

    return respData({
      message: "资源审核通过",
      resource: {
        uuid: resource.uuid,
        title: resource.title,
        status: 'approved'
      }
    });

  } catch (error) {
    log.error("审核资源失败", error as Error, {
      resourceId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      action: "approve"
    });

    return respErr("审核失败，请稍后再试");
  }
}
