import { respData, respErr, respInvalidParams, respNotFound } from "@/lib/resp";
import { log } from "@/lib/logger";
import { getSupabaseClient, withRetry } from "@/models/db";

interface RouteParams {
  params: Promise<{
    uuid: string;
  }>;
}

// GET /api/users/[uuid]/stats - 获取用户统计信息
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { uuid } = await params;

    if (!uuid) {
      return respInvalidParams("用户UUID不能为空");
    }

    log.info("获取用户统计信息", { userUuid: uuid });

    const stats = await getUserStats(uuid);

    return respData({
      stats
    });

  } catch (error) {
    log.error("获取用户统计信息失败", error as Error, {
      userUuid: (await params).uuid
    });
    return respErr("获取用户统计信息失败");
  }
}

// 获取用户统计信息
async function getUserStats(userUuid: string): Promise<{
  uploadedResourcesCount: number;
  totalVisitors: number;
}> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();

    // 获取用户上传的资源数量和总访问次数
    const { data, error } = await supabase
      .from("resources")
      .select("id, access_count")
      .eq("author_id", userUuid)
      .eq("status", "approved"); // 只统计已审核通过的资源

    if (error) {
      log.error("获取用户资源统计失败", error, { userUuid });
      throw error;
    }

    const uploadedResourcesCount = data?.length || 0;
    const totalVisitors = data?.reduce((sum, resource) => sum + (resource.access_count || 0), 0) || 0;

    log.info("用户统计信息获取成功", {
      userUuid,
      uploadedResourcesCount,
      totalVisitors
    });

    return {
      uploadedResourcesCount,
      totalVisitors
    };
  });
}
