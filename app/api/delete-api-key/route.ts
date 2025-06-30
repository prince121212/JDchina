import { respData, respErr, respInvalidParams, respUnauthorized, respNotFound } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { ApikeyStatus } from "@/models/apikey";
import { getSupabaseClient } from "@/models/db";

// DELETE /api/delete-api-key - 删除API密钥
export async function DELETE(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const body = await req.json();
    const { api_key_id } = body;

    // 验证参数
    if (!api_key_id) {
      return respInvalidParams("API密钥ID不能为空");
    }

    log.info("删除API密钥", { user_uuid, api_key_id });

    const supabase = getSupabaseClient();

    // 检查API密钥是否存在且属于当前用户
    const { data: existingKey, error: fetchError } = await supabase
      .from("apikeys")
      .select("*")
      .eq("id", api_key_id)
      .eq("user_uuid", user_uuid)
      .neq("status", ApikeyStatus.Deleted)
      .single();

    if (fetchError || !existingKey) {
      return respNotFound("API密钥不存在或无权限删除");
    }

    // 软删除API密钥（更新状态为deleted）
    const { error: updateError } = await supabase
      .from("apikeys")
      .update({ status: ApikeyStatus.Deleted })
      .eq("id", api_key_id)
      .eq("user_uuid", user_uuid);

    if (updateError) {
      log.error("删除API密钥失败", updateError, { user_uuid, api_key_id });
      throw updateError;
    }

    log.info("API密钥删除成功", { 
      user_uuid, 
      api_key_id,
      title: existingKey.title
    });

    return respData({
      message: "API密钥删除成功"
    });

  } catch (error) {
    log.error("删除API密钥失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/delete-api-key"
    });

    return respErr("删除API密钥失败，请稍后再试");
  }
}
