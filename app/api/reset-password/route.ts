import { NextRequest, NextResponse } from "next/server";
import { findEmailVerification, markEmailVerificationAsUsed } from "@/models/email-verification";
import { findEmailUser, updateUserPassword } from "@/models/user";
import { PASSWORD_CONFIG } from "@/lib/constants";
import { log } from "@/lib/logger";
import { isValidEmail } from "@/lib/email-validator";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  let email = '';
  let verificationCode = '';
  let newPassword = '';

  try {
    const requestData = await request.json();
    email = requestData.email;
    verificationCode = requestData.verificationCode;
    newPassword = requestData.newPassword;

    // 验证参数
    if (!email || !verificationCode || !newPassword) {
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

    // 验证密码强度
    if (newPassword.length < PASSWORD_CONFIG.MIN_LENGTH) {
      return NextResponse.json(
        { error: `密码长度至少${PASSWORD_CONFIG.MIN_LENGTH}位` },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const existingUser = await findEmailUser(email);
    if (!existingUser) {
      return NextResponse.json(
        { error: "该邮箱未注册" },
        { status: 400 }
      );
    }

    // 验证验证码
    const verification = await findEmailVerification(email, verificationCode, 'reset_password');
    if (!verification) {
      return NextResponse.json(
        { error: "验证码无效或已过期" },
        { status: 400 }
      );
    }

    // 加密新密码
    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_CONFIG.SALT_ROUNDS);

    try {
      // 更新用户密码
      await updateUserPassword(email, passwordHash);

      // 标记验证码为已使用
      await markEmailVerificationAsUsed(verification.id!);

      log.info("密码重置成功", { email });

      return NextResponse.json({
        message: "密码重置成功，请使用新密码登录",
      });

    } catch (dbError) {
      log.error("更新密码失败", dbError as Error, { email });
      return NextResponse.json(
        { error: "数据库错误，请稍后再试" },
        { status: 500 }
      );
    }

  } catch (error) {
    log.error("密码重置失败", error as Error, { email, verificationCode });
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}
