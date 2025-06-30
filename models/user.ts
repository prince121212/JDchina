import { User } from "@/types/user";
import { getIsoTimestr } from "@/lib/time";
import { getSupabaseClient, withRetry } from "./db";
import { log } from "@/lib/logger";
import { isValidEmail, normalizeEmail, validateEmailOrThrow } from "@/lib/email-validator";

export async function insertUser(user: User) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("users").insert(user);

  if (error) {
    throw error;
  }

  return data;
}

export async function findUserByEmail(
  email: string
): Promise<User | undefined> {
  // 验证邮箱格式
  if (!isValidEmail(email)) {
    log.error("Invalid email format", undefined, { email, function: 'findUserByEmail' });
    return undefined;
  }

  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizeEmail(email))
      .single();

    if (error) {
      // PGRST116 是 "not found" 错误，这是正常的
      if (error.code === 'PGRST116') {
        return undefined;
      }
      throw error;
    }

    return data;
  });
}

export async function findUserByUuid(uuid: string): Promise<User | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("uuid", uuid)
      .single();

    if (error) {
      // PGRST116 是 "not found" 错误，这是正常的
      if (error.code === 'PGRST116') {
        return undefined;
      }
      throw error;
    }

    return data;
  });
}

export async function getUsers(
  page: number = 1,
  limit: number = 50
): Promise<User[] | undefined> {
  if (page < 1) page = 1;
  if (limit <= 0) limit = 50;

  const offset = (page - 1) * limit;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return undefined;
  }

  return data;
}

export async function updateUserInviteCode(
  user_uuid: string,
  invite_code: string
) {
  const supabase = getSupabaseClient();
  const updated_at = getIsoTimestr();
  const { data, error } = await supabase
    .from("users")
    .update({ invite_code, updated_at })
    .eq("uuid", user_uuid);

  if (error) {
    throw error;
  }

  return data;
}

export async function updateUserInvitedBy(
  user_uuid: string,
  invited_by: string
) {
  const supabase = getSupabaseClient();
  const updated_at = getIsoTimestr();
  const { data, error } = await supabase
    .from("users")
    .update({ invited_by, updated_at })
    .eq("uuid", user_uuid);

  if (error) {
    throw error;
  }

  return data;
}

export async function getUsersByUuids(user_uuids: string[]): Promise<User[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("uuid", user_uuids);
  if (error) {
    return [];
  }

  return data as User[];
}

export async function findUserByInviteCode(invite_code: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("invite_code", invite_code)
    .single();

  if (error) {
    // PGRST116 是 "not found" 错误，这是正常的
    if (error.code === 'PGRST116') {
      return undefined;
    }
    log.error("Database error in findUserByInviteCode", error, { invite_code, function: 'findUserByInviteCode' });
    return undefined;
  }

  return data;
}

export async function getUserUuidsByEmail(email: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("uuid")
    .eq("email", email);
  if (error) {
    return [];
  }

  return data.map((user) => user.uuid);
}

/**
 * 创建邮箱注册用户
 */
export async function createEmailUser(user: User & { password_hash: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("users").insert({
    ...user,
    signin_type: 'email',
    signin_provider: 'email',
    // 保持传入的 email_verified 状态，不强制覆盖
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 验证用户邮箱
 */
export async function verifyUserEmail(email: string) {
  // 验证邮箱格式
  validateEmailOrThrow(email, 'verifyUserEmail');

  const supabase = getSupabaseClient();
  const updated_at = getIsoTimestr();
  const { data, error } = await supabase
    .from("users")
    .update({
      email_verified: true,
      email_verified_at: updated_at,
      updated_at,
    })
    .eq("email", normalizeEmail(email))
    .eq("signin_provider", "email");

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 根据邮箱查找邮箱注册用户
 */
export async function findEmailUser(email: string): Promise<User | undefined> {
  // 验证邮箱格式
  if (!isValidEmail(email)) {
    log.error("Invalid email format", undefined, { email, function: 'findEmailUser' });
    return undefined;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizeEmail(email))
    .eq("signin_provider", "email")
    .single();

  if (error) {
    // PGRST116 是 "not found" 错误，这是正常的
    if (error.code === 'PGRST116') {
      return undefined;
    }
    log.error("Database error in findEmailUser", error, { email, function: 'findEmailUser' });
    return undefined;
  }

  return data;
}

/**
 * 更新用户密码
 */
export async function updateUserPassword(email: string, password_hash: string) {
  // 验证邮箱格式
  validateEmailOrThrow(email, 'updateUserPassword');

  // 验证密码哈希不为空
  if (!password_hash || password_hash.trim().length === 0) {
    throw new Error("Password hash cannot be empty");
  }

  const supabase = getSupabaseClient();
  const updated_at = getIsoTimestr();
  const { data, error } = await supabase
    .from("users")
    .update({
      password_hash,
      updated_at,
    })
    .eq("email", normalizeEmail(email))
    .eq("signin_provider", "email");

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 更新用户个人资料
 */
export async function updateUserProfile(
  user_uuid: string,
  profile: { nickname?: string; avatar_url?: string }
) {
  if (!user_uuid) {
    throw new Error("User UUID is required");
  }

  // 验证用户名
  if (profile.nickname !== undefined) {
    if (!profile.nickname || profile.nickname.trim().length === 0) {
      throw new Error("Nickname cannot be empty");
    }
    if (profile.nickname.trim().length > 50) {
      throw new Error("Nickname cannot exceed 50 characters");
    }
  }

  const supabase = getSupabaseClient();
  const updated_at = getIsoTimestr();
  const updateData: any = { updated_at };

  if (profile.nickname !== undefined) {
    updateData.nickname = profile.nickname.trim();
  }
  if (profile.avatar_url !== undefined) {
    updateData.avatar_url = profile.avatar_url;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("uuid", user_uuid);

  if (error) {
    throw error;
  }

  return data;
}
