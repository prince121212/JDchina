import { NextRequest } from "next/server";
import { respData, respErr, respUnauthorized, respInvalidParams } from "@/lib/resp";
import { getUserUuid, getUserEmail, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { findUserByEmail } from "@/models/user";
import { increaseCredits, CreditsTransType } from "@/services/credit";

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const user_uuid = await getUserUuid();
    const user_email = await getUserEmail();

    if (!user_uuid || !user_email) {
      return respUnauthorized("请先登录");
    }

    // 检查管理员权限 - 统一使用 isUserAdmin() 函数
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      log.warn("非管理员尝试赠送积分", { user_email, user_uuid });
      return respUnauthorized("权限不足");
    }

    // 解析请求参数
    const body = await request.json();
    const { target_email, credits, reason } = body;

    // 参数验证
    if (!target_email || typeof target_email !== 'string') {
      return respInvalidParams("请输入目标用户邮箱");
    }

    if (!credits || typeof credits !== 'number' || credits <= 0) {
      return respInvalidParams("请输入有效的积分数量（大于0）");
    }

    if (credits > 10000) {
      return respInvalidParams("单次赠送积分不能超过10000");
    }

    // 查找目标用户
    const targetUser = await findUserByEmail(target_email);
    if (!targetUser || !targetUser.uuid) {
      return respErr(`用户不存在: ${target_email}`);
    }

    log.info("开始赠送积分", { 
      admin_email: user_email, 
      target_email, 
      target_uuid: targetUser.uuid,
      credits,
      reason: reason || '管理员赠送'
    });

    // 赠送积分
    await increaseCredits({
      user_uuid: targetUser.uuid!,
      trans_type: CreditsTransType.SystemAdd,
      credits: credits,
      order_no: `ADMIN_GRANT_${Date.now()}`
      // 不设置 expired_at，让系统使用默认值
    });

    log.info("积分赠送成功", { 
      admin_email: user_email,
      target_email,
      target_uuid: targetUser.uuid,
      credits,
      reason: reason || '管理员赠送'
    });

    return respData({
      success: true,
      target_user: {
        email: targetUser.email,
        nickname: targetUser.nickname,
        uuid: targetUser.uuid
      },
      credits_granted: credits,
      reason: reason || '管理员赠送'
    });

  } catch (error) {
    log.error("赠送积分失败", error as Error);
    return respErr("赠送积分失败，请稍后再试");
  }
}
