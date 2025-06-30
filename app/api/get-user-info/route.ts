import { respData, respErr, respJson } from "@/lib/resp";

import { findUserByUuid } from "@/models/user";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { getUserCredits } from "@/services/credit";
import { checkDatabaseHealth } from "@/models/db";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  const startTime = Date.now();
  let user_uuid = "";

  try {
    log.debug("开始获取用户信息", { endpoint: "/api/get-user-info" });

    // 获取用户UUID
    user_uuid = await getUserUuid();
    log.debug("获取用户UUID", {
      success: !!user_uuid,
      endpoint: "/api/get-user-info"
    });

    if (!user_uuid) {
      log.debug("用户未认证", { endpoint: "/api/get-user-info" });
      return respJson(-2, "no auth");
    }

    // 查询用户信息
    log.debug("开始查询用户信息", {
      user_uuid,
      endpoint: "/api/get-user-info"
    });
    const user = await findUserByUuid(user_uuid);
    log.debug("用户信息查询结果", {
      found: !!user,
      user_uuid,
      endpoint: "/api/get-user-info"
    });

    if (!user) {
      log.debug("用户不存在", {
        user_uuid,
        endpoint: "/api/get-user-info"
      });
      return respErr("user not exist");
    }

    // 获取用户积分
    log.debug("开始获取用户积分", {
      user_uuid,
      endpoint: "/api/get-user-info"
    });
    const userCredits = await getUserCredits(user_uuid);
    log.debug("积分获取结果", {
      credits: userCredits,
      user_uuid,
      endpoint: "/api/get-user-info"
    });

    // 获取管理员状态
    log.debug("开始检查管理员权限", {
      user_uuid,
      endpoint: "/api/get-user-info"
    });
    const adminStatus = await isUserAdmin();
    log.debug("管理员权限检查结果", {
      isAdmin: adminStatus,
      user_uuid,
      endpoint: "/api/get-user-info"
    });

    user.credits = userCredits;
    user.isAdmin = adminStatus;

    const duration = Date.now() - startTime;
    log.debug("成功获取用户信息", {
      duration,
      user_uuid,
      endpoint: "/api/get-user-info"
    });

    log.info("用户信息获取完成", {
      user_uuid,
      user_email: user.email,
      isAdmin: adminStatus,
      endpoint: "/api/get-user-info",
      duration
    });

    return respData(user);
  } catch (e) {
    const duration = Date.now() - startTime;

    log.error("获取用户信息失败", e as Error, {
      user_uuid,
      duration,
      endpoint: "/api/get-user-info"
    });

    return respErr("get user info failed");
  }
}
