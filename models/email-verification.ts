import { getSupabaseClient } from "./db";
import { getIsoTimestr } from "@/lib/time";
import { EMAIL_VERIFICATION } from "@/lib/constants";

export interface EmailVerification {
  id?: number;
  email: string;
  code: string;
  type: 'register' | 'reset_password' | 'change_email';
  created_at?: string;
  expires_at: string;
  verified_at?: string;
  attempts?: number;
  max_attempts?: number;
  is_used?: boolean;
  user_uuid?: string;
}

/**
 * 创建邮箱验证码
 */
export async function createEmailVerification(verification: EmailVerification) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_verifications")
    .insert({
      ...verification,
      created_at: getIsoTimestr(),
      attempts: 0,
      max_attempts: EMAIL_VERIFICATION.MAX_ATTEMPTS,
      is_used: false,
    });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 根据邮箱和验证码查找验证记录
 */
export async function findEmailVerification(
  email: string,
  code: string,
  type: string
): Promise<EmailVerification | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_verifications")
    .select("*")
    .eq("email", email)
    .eq("code", code)
    .eq("type", type)
    .eq("is_used", false)
    .gte("expires_at", getIsoTimestr())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return undefined;
  }

  return data;
}

/**
 * 标记验证码为已使用
 */
export async function markEmailVerificationAsUsed(id: number) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_verifications")
    .update({
      is_used: true,
      verified_at: getIsoTimestr(),
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 增加验证尝试次数
 */
export async function incrementVerificationAttempts(id: number) {
  const supabase = getSupabaseClient();

  // 先获取当前尝试次数
  const { data: currentData, error: fetchError } = await supabase
    .from("email_verifications")
    .select("attempts")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const currentAttempts = currentData?.attempts || 0;

  // 更新尝试次数
  const { data, error } = await supabase
    .from("email_verifications")
    .update({
      attempts: currentAttempts + 1,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 清理过期的验证码
 */
export async function cleanupExpiredVerifications() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_verifications")
    .delete()
    .lt("expires_at", getIsoTimestr());

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 检查邮箱是否有未过期的验证码
 */
export async function hasValidVerificationCode(
  email: string,
  type: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_verifications")
    .select("id")
    .eq("email", email)
    .eq("type", type)
    .eq("is_used", false)
    .gte("expires_at", getIsoTimestr())
    .limit(1);

  if (error) {
    return false;
  }

  return data && data.length > 0;
}

/**
 * 生成验证码
 */
export function generateVerificationCode(): string {
  // 使用更安全的随机数生成
  const crypto = require('crypto');
  const min = Math.pow(10, EMAIL_VERIFICATION.CODE_LENGTH - 1);
  const max = Math.pow(10, EMAIL_VERIFICATION.CODE_LENGTH) - 1;
  const randomBytes = crypto.randomBytes(4);
  const randomInt = randomBytes.readUInt32BE(0);
  return (min + (randomInt % (max - min + 1))).toString();
}

/**
 * 获取验证码过期时间
 */
export function getVerificationExpireTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + EMAIL_VERIFICATION.EXPIRE_MINUTES);
  return now.toISOString();
}
