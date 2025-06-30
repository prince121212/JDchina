/**
 * 邮件发送API接口
 * Email Sending API Route
 */

import { respData, respErr, respInvalidParams } from "@/lib/resp";
import { sendEmailServer, testEmailServiceServer } from "@/lib/email-server";
import { EmailType } from "@/types/email";
import { getUserUuid, getUserEmail } from "@/services/user";
import { findUserByEmail } from "@/models/user";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const {
      type,
      to,
      subject,
      content,
      html,
      data,
      restrictToRegisteredUsers = true,
    } = await req.json();

    // 验证必要参数
    if (!type) {
      return respErr("邮件类型不能为空");
    }

    // 获取当前用户信息
    const user_uuid = await getUserUuid();
    const user_email = await getUserEmail();

    log.info("邮件发送API - 用户信息", { user_uuid, user_email, endpoint: "/api/send-email" });

    if (!user_uuid) {
      log.warn("邮件发送API - 用户未登录", { endpoint: "/api/send-email" });
      return respErr("用户未登录");
    }

    // 检查管理员权限（通过环境变量）
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
    const isAdmin = adminEmails.includes(user_email);

    if (!isAdmin) {
      log.security("邮件发送API - 无管理员权限", { user_email, endpoint: "/api/send-email" });
      return respErr("无管理员权限");
    }

    log.audit("邮件发送API - 管理员权限验证通过", { user_email, endpoint: "/api/send-email" });

    // 检查权限限制（某些邮件类型需要管理员权限）
    if ((type === EmailType.SYSTEM_NOTIFICATION || type === EmailType.CUSTOM) && !isAdmin) {
      return respErr("权限不足，只有管理员可以发送此类邮件");
    }

    // 验证必要参数
    if (!to) {
      return respErr("收件人不能为空");
    }

    // 验证收件人是否为已注册用户（如果开启了限制）
    if (restrictToRegisteredUsers) {
      const recipientUser = await findUserByEmail(to);
      if (!recipientUser) {
        return respInvalidParams("收件人邮箱未注册，请关闭用户限制选项或确认邮箱地址正确");
      }
    }

    if (type === EmailType.CUSTOM && !subject) {
      return respErr("自定义邮件标题不能为空");
    }

    // 使用服务端邮件服务发送邮件
    const result = await sendEmailServer({
      type,
      to,
      subject,
      content,
      html,
      data,
    });

    if (result) {
      return respData({
        success: true,
        message: "邮件发送成功",
        type,
        to,
      });
    } else {
      return respErr("邮件发送失败");
    }
  } catch (error) {
    log.error("邮件发送API异常", error as Error, { endpoint: "/api/send-email" });
    return respErr("邮件发送异常: " + (error as Error).message);
  }
}

// 测试邮件服务连接
export async function GET() {
  try {
    const user_uuid = await getUserUuid();
    const user_email = await getUserEmail();
    
    if (!user_uuid) {
      return respErr("用户未登录");
    }

    // 检查管理员权限
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
    const isAdmin = adminEmails.includes(user_email);

    if (!isAdmin) {
      return respErr("权限不足，只有管理员可以测试邮件服务");
    }

    // 使用服务端测试函数
    const testResult = await testEmailServiceServer();

    return respData({
      success: true,
      message: "邮件服务测试完成",
      result: testResult,
    });
  } catch (error) {
    log.error("邮件服务测试异常", error as Error, { endpoint: "/api/send-email" });
    return respErr("邮件服务测试异常: " + (error as Error).message);
  }
}
