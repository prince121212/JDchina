import { getSupabaseClient, withRetry } from "./db";
import { log } from "@/lib/logger";
import { updateResourceRatingStats } from "./resource";
import { ResourceRating } from "@/types/resource";

// 添加或更新资源评分
export async function addResourceRating(rating: Omit<ResourceRating, 'id' | 'created_at'>): Promise<ResourceRating> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    // 验证评分范围
    if (rating.rating < 1 || rating.rating > 5) {
      throw new Error("评分必须在1-5之间");
    }

    // 使用 upsert 防止重复评分
    const { data, error } = await supabase
      .from("resource_ratings")
      .upsert(rating, { onConflict: 'user_uuid,resource_id' })
      .select()
      .single();
    
    if (error) {
      log.error("添加资源评分失败", error, rating);
      throw error;
    }
    
    // 更新资源平均评分
    await updateResourceRatingStats(rating.resource_id);
    
    log.info("资源评分添加成功", { 
      resourceId: rating.resource_id, 
      userUuid: rating.user_uuid,
      rating: rating.rating
    });
    
    return data;
  });
}

// 获取用户对资源的评分
export async function getUserResourceRating(userUuid: string, resourceId: number): Promise<ResourceRating | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("resource_ratings")
      .select("*")
      .eq("user_uuid", userUuid)
      .eq("resource_id", resourceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      log.error("获取用户资源评分失败", error, { userUuid, resourceId });
      throw error;
    }

    return data;
  });
}

// 获取资源的所有评分
export async function getResourceRatings(resourceId: number): Promise<ResourceRating[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("resource_ratings")
      .select("*")
      .eq("resource_id", resourceId)
      .order("created_at", { ascending: false });

    if (error) {
      log.error("获取资源评分失败", error, { resourceId });
      throw error;
    }

    return data || [];
  });
}

// 获取用户的所有评分
export async function getUserRatings(params: {
  user_uuid: string;
  search?: string;
  sort?: string;
  offset?: number;
  limit?: number;
}): Promise<ResourceRating[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    let query = supabase
      .from("resource_ratings")
      .select(`
        *,
        resource:resources!resource_ratings_resource_id_fkey(
          uuid,
          title,
          description,
          category:categories!resources_category_id_fkey(name)
        )
      `)
      .eq("user_uuid", params.user_uuid);

    // 搜索功能
    if (params.search) {
      query = query.or(`resource.title.ilike.%${params.search}%,resource.description.ilike.%${params.search}%`);
    }

    // 排序
    const sortOrder = params.sort === 'oldest' ? { ascending: true } : { ascending: false };
    query = query.order("created_at", sortOrder);

    // 分页
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
    } else if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      log.error("获取用户评分失败", error, { user_uuid: params.user_uuid });
      throw error;
    }

    return data || [];
  });
}

// 删除评分
export async function deleteResourceRating(userUuid: string, resourceId: number): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("resource_ratings")
      .delete()
      .eq("user_uuid", userUuid)
      .eq("resource_id", resourceId);

    if (error) {
      log.error("删除资源评分失败", error, { userUuid, resourceId });
      throw error;
    }

    // 更新资源平均评分
    await updateResourceRatingStats(resourceId);

    log.info("资源评分删除成功", { userUuid, resourceId });
  });
}

// 获取评分统计信息
export async function getRatingStats(resourceId: number): Promise<{
  average: number;
  count: number;
  distribution: { [key: number]: number };
}> {
  return withRetry(async () => {
    const ratings = await getResourceRatings(resourceId);

    const count = ratings.length;
    const average = count > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

    // 评分分布统计
    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
      distribution[rating.rating] = (distribution[rating.rating] || 0) + 1;
    });

    return {
      average: Math.round(average * 100) / 100, // 保留两位小数
      count,
      distribution
    };
  });
}

// 获取资源评分统计信息 (用于API)
export async function getResourceRatingStats(resourceId: number): Promise<{
  averageRating: number;
  totalRatings: number;
  distribution: { [key: number]: number };
}> {
  const stats = await getRatingStats(resourceId);
  return {
    averageRating: stats.average,
    totalRatings: stats.count,
    distribution: stats.distribution
  };
}
