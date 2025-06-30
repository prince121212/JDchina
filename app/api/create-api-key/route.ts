import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { insertApikey, ApikeyStatus } from "@/models/apikey";
import { getNonceStr } from "@/lib/hash";
import { getIsoTimestr } from "@/lib/time";
import { Apikey } from "@/types/apikey";

// POST /api/create-api-key - 创建新的API密钥
export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const body = await req.json();
    const { title } = body;

    // 验证参数
    if (!title || !title.trim()) {
      return respInvalidParams("API密钥名称不能为空");
    }

    if (title.trim().length > 100) {
      return respInvalidParams("API密钥名称不能超过100个字符");
    }

    log.info("创建API密钥", { user_uuid, title: title.trim() });

    // 生成API密钥
    const apiKey = `sk-${getNonceStr(32)}`;

    const newApiKey: Apikey = {
      user_uuid,
      api_key: apiKey,
      title: title.trim(),
      created_at: getIsoTimestr(),
      status: ApikeyStatus.Created,
    };

    await insertApikey(newApiKey);

    log.info("API密钥创建成功", { 
      user_uuid, 
      title: title.trim(),
      keyPrefix: apiKey.substring(0, 8) + "..."
    });

    return respData({
      message: "API密钥创建成功",
      apiKey: {
        ...newApiKey,
        api_key: apiKey // 只在创建时返回完整密钥
      }
    });

  } catch (error) {
    log.error("创建API密钥失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/create-api-key"
    });

    return respErr("创建API密钥失败，请稍后再试");
  }
}
