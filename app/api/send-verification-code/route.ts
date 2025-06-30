import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/services/email";
import {
  createEmailVerification,
  generateVerificationCode,
  getVerificationExpireTime,
  hasValidVerificationCode,
} from "@/models/email-verification";
import { findEmailUser } from "@/models/user";
import { getClientIp } from "@/lib/ip";
import { EMAIL_VERIFICATION } from "@/lib/constants";
import { log } from "@/lib/logger";
import { isValidEmail } from "@/lib/email-validator";

// 限制发送频率的内存存储（生产环境建议使用Redis）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// 清理过期的限制记录
function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// 定期清理过期记录，防止内存泄漏
let cleanupInterval: NodeJS.Timeout | null = null;

// 启动清理定时器
function startCleanupTimer() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      cleanupRateLimit();
      // 如果Map为空，停止定时器以节省资源
      if (rateLimitMap.size === 0 && cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }
}



// 检查发送频率限制
function checkRateLimit(ip: string, email: string): boolean {
  // 启动清理定时器（如果还没启动）
  startCleanupTimer();

  // 立即清理过期记录
  cleanupRateLimit();

  const key = `${ip}:${email}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分钟窗口
  const maxAttempts = EMAIL_VERIFICATION.RATE_LIMIT_PER_MINUTE; // 每分钟最多发送次数

  const record = rateLimitMap.get(key);
  if (!record) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  let email = '';
  let type = '';

  try {
    const requestData = await request.json();
    email = requestData.email;
    type = requestData.type;

    // 验证参数
    if (!email || !type) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    // 验证类型
    if (!['register', 'reset_password', 'change_email'].includes(type)) {
      return NextResponse.json(
        { error: "验证类型不正确" },
        { status: 400 }
      );
    }

    // 获取客户端IP
    const clientIp = await getClientIp();

    // 检查发送频率限制
    if (!checkRateLimit(clientIp, email)) {
      return NextResponse.json(
        { error: "发送过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    // 根据类型进行不同的验证
    if (type === 'register') {
      // 注册时检查邮箱是否已存在
      const existingUser = await findEmailUser(email);
      if (existingUser) {
        return NextResponse.json(
          { error: "该邮箱已注册，请直接登录" },
          { status: 400 }
        );
      }
    } else if (type === 'reset_password') {
      // 重置密码时检查邮箱是否存在
      const existingUser = await findEmailUser(email);
      if (!existingUser) {
        return NextResponse.json(
          { error: "该邮箱未注册" },
          { status: 400 }
        );
      }
    }

    // 检查是否已有未过期的验证码
    const hasValid = await hasValidVerificationCode(email, type);
    if (hasValid) {
      return NextResponse.json(
        { error: "验证码已发送，请检查邮箱或稍后再试" },
        { status: 400 }
      );
    }

    // 生成验证码
    const code = generateVerificationCode();
    const expiresAt = getVerificationExpireTime();

    // 保存验证码到数据库
    try {
      await createEmailVerification({
        email,
        code,
        type: type as 'register' | 'reset_password' | 'change_email',
        expires_at: expiresAt,
      });
      log.info("验证码已保存到数据库", { email, type });
    } catch (dbError) {
      log.error("保存验证码到数据库失败", dbError as Error, { email, type });
      return NextResponse.json(
        { error: "数据库错误，请稍后再试" },
        { status: 500 }
      );
    }

    // 发送验证码邮件
    try {
      const success = await emailService.sendVerificationCodeEmail(
        email,
        code,
        type as 'register' | 'reset_password' | 'change_email'
      );

      if (!success) {
        log.error("邮件发送失败", undefined, { email, type });
        return NextResponse.json(
          { error: "邮件发送失败，请稍后再试" },
          { status: 500 }
        );
      }
      log.info("验证码邮件发送成功", { email, type });
    } catch (emailError) {
      log.error("邮件发送异常", emailError as Error, { email, type });
      return NextResponse.json(
        { error: "邮件服务异常，请稍后再试" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "验证码已发送，请查收邮件",
      expires_in: EMAIL_VERIFICATION.EXPIRE_MINUTES * 60, // 转换为秒
    });

  } catch (error) {
    log.error("发送验证码失败", error as Error, { email, type });
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}

// 注意：在Next.js API路由中，只能导出HTTP方法函数
// 如果需要在测试中使用这些函数，可以将它们移到单独的工具文件中
