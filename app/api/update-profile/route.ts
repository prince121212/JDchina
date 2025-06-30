import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { updateUserProfile, findUserByUuid } from "@/models/user";

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { nickname, avatar_url } = await req.json();

    // 验证参数
    if (!nickname && !avatar_url) {
      return respInvalidParams("请提供要更新的信息");
    }

    // 验证用户名
    if (nickname !== undefined) {
      if (typeof nickname !== 'string') {
        return respInvalidParams("用户名格式不正确");
      }
      if (!nickname.trim()) {
        return respInvalidParams("用户名不能为空");
      }
      if (nickname.trim().length > 50) {
        return respInvalidParams("用户名不能超过50个字符");
      }
    }

    // 验证头像URL
    if (avatar_url !== undefined) {
      if (typeof avatar_url !== 'string') {
        return respInvalidParams("头像URL格式不正确");
      }
    }

    // 更新用户信息
    const updateData: { nickname?: string; avatar_url?: string } = {};
    if (nickname !== undefined) {
      updateData.nickname = nickname.trim();
    }
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url;
    }

    await updateUserProfile(user_uuid, updateData);

    // 获取更新后的用户信息
    const updatedUser = await findUserByUuid(user_uuid);
    if (!updatedUser) {
      return respErr("获取用户信息失败");
    }

    return respData({
      nickname: updatedUser.nickname,
      avatar_url: updatedUser.avatar_url,
    });
  } catch (error) {
    console.error("update profile failed:", error);
    if (error instanceof Error) {
      if (error.message.includes("Nickname cannot be empty")) {
        return respInvalidParams("用户名不能为空");
      }
      if (error.message.includes("Nickname cannot exceed 50 characters")) {
        return respInvalidParams("用户名不能超过50个字符");
      }
    }
    return respErr("更新个人资料失败，请稍后再试");
  }
}
