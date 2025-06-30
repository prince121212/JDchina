import { respData, respErr, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { findUserByUuid } from "@/models/user";

// GET /api/my-invites - 获取当前用户的邀请信息
export async function GET(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    log.info("获取用户邀请信息", { user_uuid });

    // 获取用户信息
    const user = await findUserByUuid(user_uuid);
    if (!user) {
      return respUnauthorized("用户信息无效");
    }

    // 构建邀请链接
    const inviteLink = user.invite_code 
      ? `${process.env.NEXT_PUBLIC_WEB_URL}/i/${user.invite_code}`
      : null;

    // TODO: 获取邀请统计信息
    // 这里可以添加获取邀请人数、奖励等信息的逻辑
    const inviteStats = {
      totalInvites: 0,
      successfulInvites: 0,
      totalRewards: 0
    };

    return respData({
      user: {
        uuid: user.uuid,
        nickname: user.nickname,
        email: user.email,
        invite_code: user.invite_code,
        invited_by: user.invited_by
      },
      inviteLink,
      stats: inviteStats
    });

  } catch (error) {
    log.error("获取用户邀请信息失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/my-invites"
    });

    return respErr("获取邀请信息失败，请稍后再试");
  }
}
