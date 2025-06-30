import { respData, respErr, respInvalidParams, respUnauthorized, respNotFound } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { findResourceByUuid, incrementResourceAccess } from "@/models/resource";

import { getUserCredits, decreaseCredits, CreditsTransType } from "@/services/credit";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/resources/[id]/access - 记录资源访问
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    log.info("记录资源访问", { resourceUuid: id });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    // 检查资源状态
    if (resource.status !== 'approved') {
      return respErr("资源未通过审核，无法访问");
    }

    // 获取用户信息（可选，匿名用户也可以访问免费资源）
    const user_uuid = await getUserUuid().catch(() => null);

    // 如果是付费资源，需要用户登录
    if (!resource.is_free && !user_uuid) {
      return respUnauthorized("付费资源需要登录后访问");
    }

    // 如果是付费资源，检查用户积分并扣除
    if (!resource.is_free && user_uuid) {
      const requiredCredits = resource.credits || 0;

      if (requiredCredits > 0) {
        // 检查用户积分余额
        const userCredits = await getUserCredits(user_uuid);

        if (userCredits.left_credits < requiredCredits) {
          return respErr(`积分不足，需要${requiredCredits}积分，当前余额${userCredits.left_credits}积分`);
        }

        // 扣除积分
        try {
          await decreaseCredits({
            user_uuid,
            trans_type: CreditsTransType.ResourceAccess,
            credits: requiredCredits,
            order_no: resource.uuid // 使用order_no字段存储资源UUID
          });

          log.info("积分扣除成功", {
            user_uuid,
            resourceUuid: id,
            creditsDeducted: requiredCredits
          });
        } catch (error) {
          log.error("积分扣除失败", error as Error, {
            user_uuid,
            resourceUuid: id,
            requiredCredits
          });
          return respErr("积分扣除失败，请稍后再试");
        }
      }
    }

    // 增加访问次数（异步执行，不影响响应）
    if (resource.id) {
      incrementResourceAccess(id).catch(error => {
        log.warn("更新访问次数失败", { error: error as Error, resourceUuid: id });
      });
    }



    log.info("资源访问记录成功", {
      resourceUuid: id,
      title: resource.title,
      user_uuid: user_uuid || 'anonymous'
    });

    return respData({
      message: "访问记录成功",
      resource_url: resource.file_url,
      credits_cost: resource.is_free ? 0 : (resource.credits || 0)
    });

  } catch (error) {
    log.error("记录资源访问失败", error as Error, {
      resourceUuid: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });

    return respErr("访问记录失败，请稍后再试");
  }
}
