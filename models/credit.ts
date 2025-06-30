import { Credit } from "@/types/credit";
import { getSupabaseClient } from "@/models/db";

export async function insertCredit(credit: Omit<Credit, 'id'>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("credits").insert(credit);

  if (error) {
    throw error;
  }

  return data;
}

export async function findCreditByTransNo(
  trans_no: string
): Promise<Credit | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("trans_no", trans_no)
    .limit(1)
    .single();

  if (error) {
    return undefined;
  }

  return data;
}

export async function findCreditByOrderNo(
  order_no: string
): Promise<Credit | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("order_no", order_no)
    .limit(1)
    .single();

  if (error) {
    return undefined;
  }

  return data;
}

export async function getUserValidCredits(
  user_uuid: string
): Promise<Credit[] | undefined> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("user_uuid", user_uuid)
    .or(`expired_at.gte.${now},expired_at.is.null`)
    .order("expired_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function getCreditsByUserUuid(
  user_uuid: string,
  page: number = 1,
  limit: number = 50
): Promise<Credit[] | undefined> {
  if (page < 1) page = 1;
  if (limit <= 0) limit = 50;

  const supabase = getSupabaseClient();

  // 添加调试日志
  console.log("getCreditsByUserUuid 查询参数:", { user_uuid, page, limit });

  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("user_uuid", user_uuid)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  // 添加调试日志
  console.log("getCreditsByUserUuid 查询结果:", { data, error, count: data?.length });

  if (error) {
    console.error("getCreditsByUserUuid 查询错误:", error);
    return undefined;
  }

  return data;
}
