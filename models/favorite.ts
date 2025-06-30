import { getSupabaseClient, withRetry } from "./db";
import { log } from "@/lib/logger";
import { UserFavorite } from "@/types/resource";

export interface FavoriteWithResource extends UserFavorite {
  resource?: {
    uuid: string;
    title: string;
    description: string;
    rating_avg: number;
    access_count: number;
    view_count: number;
    created_at: string;
    category?: {
      id: number;
      name: string;
      description?: string;
    };
  };
}

// 添加收藏
export async function addFavorite(favorite: { user_uuid: string; resource_id: number }): Promise<UserFavorite> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("user_favorites")
      .insert(favorite)
      .select()
      .single();

    if (error) {
      log.error("添加收藏失败", error, favorite);
      throw error;
    }

    log.info("添加收藏成功", { favoriteId: data.id, ...favorite });
    return data;
  });
}

// 切换收藏状态
export async function toggleFavorite(userUuid: string, resourceId: number): Promise<{ action: 'added' | 'removed' }> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    // 检查是否已收藏
    const { data: existing } = await supabase
      .from("user_favorites")
      .select("id")
      .eq("user_uuid", userUuid)
      .eq("resource_id", resourceId)
      .single();
    
    if (existing) {
      // 取消收藏
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_uuid", userUuid)
        .eq("resource_id", resourceId);
      
      if (error) {
        log.error("取消收藏失败", error, { userUuid, resourceId });
        throw error;
      }
      
      log.info("取消收藏成功", { userUuid, resourceId });
      return { action: 'removed' };
    } else {
      // 添加收藏
      const { error } = await supabase
        .from("user_favorites")
        .insert({ user_uuid: userUuid, resource_id: resourceId });
      
      if (error) {
        log.error("添加收藏失败", error, { userUuid, resourceId });
        throw error;
      }
      
      log.info("添加收藏成功", { userUuid, resourceId });
      return { action: 'added' };
    }
  });
}

// 检查是否已收藏
export async function isFavorited(userUuid: string, resourceId: number): Promise<boolean> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_favorites")
      .select("id")
      .eq("user_uuid", userUuid)
      .eq("resource_id", resourceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      log.error("检查收藏状态失败", error, { userUuid, resourceId });
      throw error;
    }

    return !!data;
  });
}

// 获取用户的收藏列表
export async function getUserFavorites(
  userUuid: string, 
  offset?: number, 
  limit?: number
): Promise<FavoriteWithResource[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    let query = supabase
      .from("user_favorites")
      .select(`
        *,
        resource:resources!user_favorites_resource_id_fkey(
          uuid,
          title,
          description,
          rating_avg,
          access_count,
          view_count,
          created_at,
          category:categories!resources_category_id_fkey(id, name, description)
        )
      `)
      .eq("user_uuid", userUuid)
      .order("created_at", { ascending: false });

    if (offset !== undefined && limit !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      log.error("获取用户收藏列表失败", error, { userUuid });
      throw error;
    }

    return data || [];
  });
}

// 获取用户收藏数量
export async function getUserFavoriteCount(userUuid: string): Promise<number> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from("user_favorites")
      .select("*", { count: 'exact', head: true })
      .eq("user_uuid", userUuid);

    if (error) {
      log.error("获取用户收藏数量失败", error, { userUuid });
      throw error;
    }

    return count || 0;
  });
}

// 获取资源的收藏数量
export async function getResourceFavoriteCount(resourceId: number): Promise<number> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from("user_favorites")
      .select("*", { count: 'exact', head: true })
      .eq("resource_id", resourceId);

    if (error) {
      log.error("获取资源收藏数量失败", error, { resourceId });
      throw error;
    }

    return count || 0;
  });
}

// 批量检查收藏状态
export async function checkMultipleFavorites(
  userUuid: string, 
  resourceIds: number[]
): Promise<{ [resourceId: number]: boolean }> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_favorites")
      .select("resource_id")
      .eq("user_uuid", userUuid)
      .in("resource_id", resourceIds);

    if (error) {
      log.error("批量检查收藏状态失败", error, { userUuid, resourceIds });
      throw error;
    }

    const favoriteMap: { [resourceId: number]: boolean } = {};
    resourceIds.forEach(id => {
      favoriteMap[id] = false;
    });

    data?.forEach(item => {
      favoriteMap[item.resource_id] = true;
    });

    return favoriteMap;
  });
}

// 根据ID获取收藏记录
export async function getFavoriteById(favoriteId: number): Promise<UserFavorite | null> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_favorites")
      .select("*")
      .eq("id", favoriteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      log.error("获取收藏记录失败", error, { favoriteId });
      throw error;
    }

    return data;
  });
}

// 移除收藏（通过用户UUID和资源ID）
export async function removeFavorite(userUuid: string, resourceId: number): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_uuid", userUuid)
      .eq("resource_id", resourceId);

    if (error) {
      log.error("移除收藏失败", error, { userUuid, resourceId });
      throw error;
    }

    log.info("移除收藏成功", { userUuid, resourceId });
  });
}

// 根据收藏ID移除收藏
export async function removeFavoriteById(favoriteId: number): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("id", favoriteId);

    if (error) {
      log.error("根据ID移除收藏失败", error, { favoriteId });
      throw error;
    }

    log.info("根据ID移除收藏成功", { favoriteId });
  });
}

// 清空用户收藏
export async function clearUserFavorites(userUuid: string): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_uuid", userUuid);

    if (error) {
      log.error("清空用户收藏失败", error, { userUuid });
      throw error;
    }

    log.info("清空用户收藏成功", { userUuid });
  });
}

// 获取最受欢迎的资源（按收藏数排序）
export async function getMostFavoritedResources(limit: number = 10): Promise<{
  resource_id: number;
  favorite_count: number;
}[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();

    // 使用数据库视图或RPC函数来实现聚合查询
    // 由于Supabase的聚合查询语法限制，我们使用优化的方法
    const { data, error } = await supabase
      .rpc('get_most_favorited_resources', {
        limit_count: limit
      });

    if (error) {
      log.error("获取最受欢迎资源失败", error);
      throw error;
    }

    // 转换数据格式
    const result = (data || []).map((item: { resource_id: number; count: number }) => ({
      resource_id: item.resource_id,
      favorite_count: item.count
    }));

    log.info("获取最受欢迎资源成功", { count: result.length, limit });
    return result;
  });
}
