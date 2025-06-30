import { respData, respErr } from "@/lib/resp";
import { isUserAdmin, getUserUuid, getUserEmail } from "@/services/user";
import { log } from "@/lib/logger";

/**
 * 检查当前用户是否为管理员
 */
export async function GET() {
  try {
    const user_uuid = await getUserUuid();
    const user_email = await getUserEmail();

    if (!user_uuid) {
      log.warn("管理员权限检查 - 用户未登录", { endpoint: "/api/check-admin" });
      return respErr("用户未登录", 401);
    }

    const isAdmin = await isUserAdmin();

    log.info("管理员权限检查完成", {
      user_uuid,
      user_email,
      isAdmin,
      endpoint: "/api/check-admin"
    });

    return respData({
      isAdmin,
    });
  } catch (error) {
    log.error("检查管理员权限失败", error as Error, { endpoint: "/api/check-admin" });
    return respErr("检查管理员权限失败");
  }
}
