import {
  findUserByInviteCode,
  findUserByUuid,
  updateUserInviteCode,
} from "@/models/user";
import { respData, respInvalidParams, respUnauthorized, respErr, ErrorCode } from "@/lib/resp";

import { getUserUuid } from "@/services/user";

export async function POST(req: Request) {
  try {
    const { invite_code } = await req.json();

    // 邀请码可以为空，表示不设置邀请码
    if (invite_code !== undefined && invite_code !== null && invite_code !== '') {
      // 验证邀请码格式
      if (typeof invite_code !== 'string' || invite_code.length < 2 || invite_code.length > 16) {
        return respInvalidParams("邀请码长度必须在2-16字符之间");
      }

      // 验证邀请码只包含字母数字
      if (!/^[a-zA-Z0-9]+$/.test(invite_code)) {
        return respInvalidParams("邀请码只能包含字母和数字");
      }
    }

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const user_info = await findUserByUuid(user_uuid);
    if (!user_info || !user_info.email) {
      return respUnauthorized("用户信息无效");
    }

    // 如果邀请码没有变化，直接返回
    if (user_info.invite_code === invite_code) {
      return respData(user_info);
    }

    // 如果设置了邀请码，检查是否已被使用
    if (invite_code && invite_code.trim() !== '') {
      const user_by_invite_code = await findUserByInviteCode(invite_code);
      if (user_by_invite_code) {
        if (user_by_invite_code.uuid !== user_uuid) {
          return respInvalidParams("邀请码已被使用，请选择其他邀请码");
        }

        return respData(user_by_invite_code);
      }
    }

    // 更新邀请码（可以为空字符串，表示清除邀请码）
    const finalInviteCode = invite_code && invite_code.trim() !== '' ? invite_code.trim() : '';
    await updateUserInviteCode(user_uuid, finalInviteCode);

    user_info.invite_code = finalInviteCode;

    return respData(user_info);
  } catch (e) {
    console.error("update invite code failed", e);
    return respErr("更新邀请码失败，请稍后再试", ErrorCode.DATABASE_ERROR);
  }
}
