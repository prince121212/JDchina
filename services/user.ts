import { CreditsAmount, CreditsTransType } from "./credit";
import { findUserByEmail, findUserByUuid, insertUser } from "@/models/user";

import { User } from "@/types/user";
import { auth } from "@/auth";
import { getOneYearLaterTimestr } from "@/lib/time";
import { getUserUuidByApiKey } from "@/models/apikey";
import { headers } from "next/headers";
import { increaseCredits } from "./credit";
import { log } from "@/lib/logger";
import { emailService } from "./email";

export async function saveUser(user: User) {
  try {
    const existUser = await findUserByEmail(user.email);
    const isNewUser = !existUser;

    if (isNewUser) {
      await insertUser(user);

      // increase credits for new user, expire in one year
      await increaseCredits({
        user_uuid: user.uuid || "",
        trans_type: CreditsTransType.NewUser,
        credits: CreditsAmount.NewUserGet,
        expired_at: getOneYearLaterTimestr(),
      });

      // 发送欢迎邮件（非阻塞）
      if (user.email && user.uuid) {
        emailService.sendWelcomeEmail(user.email, user.nickname || undefined)
          .then((success) => {
            if (success) {
              log.info("欢迎邮件发送成功", { email: user.email });
            } else {
              log.warn("欢迎邮件发送失败", { email: user.email });
            }
          })
          .catch((error) => {
            log.error("欢迎邮件发送异常", error, { email: user.email });
          });
      }
    } else {
      user.id = existUser.id;
      user.uuid = existUser.uuid;
      user.created_at = existUser.created_at;
    }

    return user;
  } catch (e) {
    log.error("save user failed", e as Error, { email: user.email });
    throw e;
  }
}

export async function getUserUuid() {
  let user_uuid = "";

  const token = await getBearerToken();

  if (token) {
    // api key
    if (token.startsWith("sk-")) {
      const user_uuid = await getUserUuidByApiKey(token);

      return user_uuid || "";
    }
  }

  const session = await auth();
  if (session && session.user && session.user.uuid) {
    user_uuid = session.user.uuid;
  }

  return user_uuid;
}

export async function getBearerToken() {
  const h = await headers();
  const auth = h.get("Authorization");
  if (!auth) {
    return "";
  }

  return auth.replace("Bearer ", "");
}

export async function getUserEmail() {
  let user_email = "";

  const session = await auth();
  if (session && session.user && session.user.email) {
    user_email = session.user.email;
  }

  return user_email;
}

export async function getUserInfo() {
  let user_uuid = await getUserUuid();

  if (!user_uuid) {
    return;
  }

  const user = await findUserByUuid(user_uuid);

  return user;
}

/**
 * 检查当前用户是否为管理员
 * @returns Promise<boolean> 是否为管理员
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const user_email = await getUserEmail();

    if (!user_email) {
      log.debug("管理员权限检查 - 用户邮箱为空");
      return false;
    }

    // 获取管理员邮箱列表
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean);

    const isAdmin = adminEmails.includes(user_email);

    log.debug("管理员权限检查结果", {
      user_email,
      isAdmin,
      adminEmailsCount: adminEmails.length
    });

    return isAdmin;
  } catch (error) {
    log.error("检查管理员权限失败", error as Error, { function: "isUserAdmin" });
    return false;
  }
}
