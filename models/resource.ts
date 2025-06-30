import { getSupabaseClient, withRetry } from "./db";
import { log } from "@/lib/logger";
import { wrapQueryWithMonitoring } from "@/lib/db-performance";
import { Resource, ResourceWithDetails } from "@/types/resource";

// 安全的搜索词处理函数
function sanitizeSearchTerm(searchTerm: string): string {
  if (!searchTerm) return '';

  // 移除潜在的危险字符，只保留字母、数字、中文、空格和常见标点
  const sanitized = searchTerm
    .replace(/[^\w\s\u4e00-\u9fff\-_.]/g, '')
    .trim()
    .substring(0, 100); // 限制长度

  return sanitized;
}

// 复用现有的错误处理和日志模式
export async function insertResource(resource: Omit<Resource, 'id' | 'created_at' | 'updated_at'>) {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("resources")
      .insert(resource)
      .select()
      .single();
    
    if (error) {
      log.error("插入资源失败", error, { resource: resource.title });
      throw error;
    }
    
    log.info("资源创建成功", { resourceId: resource.uuid, title: resource.title });
    return data;
  });
}

export async function findResourceByUuid(uuid: string): Promise<ResourceWithDetails | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("resources")
      .select(`
        *,
        author:users!resources_author_id_fkey(uuid, nickname, avatar_url),
        category:categories!resources_category_id_fkey(id, name, description)
      `)
      .eq("uuid", uuid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      log.error("查询资源失败", error, { uuid });
      throw error;
    }

    return data;
  });
}

export async function updateResource(uuid: string, updates: Partial<Resource>) {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("resources")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("uuid", uuid)
      .select()
      .single();

    if (error) {
      log.error("更新资源失败", error, { uuid, updates });
      throw error;
    }

    log.info("资源更新成功", { uuid, updates: Object.keys(updates) });
    return data;
  });
}

export async function deleteResource(uuid: string) {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("resources")
      .delete()
      .eq("uuid", uuid);

    if (error) {
      log.error("删除资源失败", error, { uuid });
      throw error;
    }

    log.info("资源删除成功", { uuid });
  });
}

// 获取资源总数（用于分页）
export async function getResourcesCount(params: {
  category?: string;
  tags?: string[];
  search?: string;
  status?: string;
}): Promise<number> {
  return wrapQueryWithMonitoring(
    'getResourcesCount',
    async () => withRetry(async () => {
      const supabase = getSupabaseClient();
      let query = supabase
        .from("resources")
        .select('id', { count: 'exact', head: true });

      // 状态筛选
      if (params.status) {
        query = query.eq("status", params.status);
      } else {
        // 默认只显示已审核通过的资源
        query = query.eq("status", "approved");
      }

      // 分类筛选
      if (params.category) {
        query = query.eq("category_id", params.category);
      }

      // 标签筛选
      if (params.tags && params.tags.length > 0) {
        const validTags = params.tags.filter(tag =>
          tag && typeof tag === 'string' && tag.trim().length > 0
        ).map(tag => tag.trim());

        if (validTags.length > 0) {
          const { data: tagIds, error: tagError } = await supabase
            .from('tags')
            .select('id')
            .in('name', validTags);

          if (tagError) {
            log.error("查询标签ID失败", tagError, { tags: validTags });
            throw tagError;
          }

          if (tagIds && tagIds.length > 0) {
            const tagIdList = tagIds.map(t => t.id);
            const { data: resourceIds, error: resourceError } = await supabase
              .from('resource_tags')
              .select('resource_id')
              .in('tag_id', tagIdList);

            if (resourceError) {
              log.error("查询标签资源关联失败", resourceError, { tagIds: tagIdList });
              throw resourceError;
            }

            if (resourceIds && resourceIds.length > 0) {
              const resourceIdList = resourceIds.map(r => r.resource_id);
              query = query.in('id', resourceIdList);
            } else {
              return 0; // 没有找到相关资源
            }
          } else {
            return 0; // 标签不存在
          }
        }
      }

      // 搜索
      if (params.search) {
        const searchTerm = sanitizeSearchTerm(params.search);
        if (searchTerm.length > 0) {
          // 使用参数化查询，避免SQL注入风险
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
      }

      const { count, error } = await query;

      if (error) {
        log.error("获取资源总数失败", error, params);
        throw error;
      }

      return count || 0;
    }),
    200 // 200ms慢查询阈值
  );
}

export async function getResourcesList(params: {
  category?: string;
  tags?: string[];
  search?: string;
  sort?: string;
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<ResourceWithDetails[]> {
  return wrapQueryWithMonitoring(
    'getResourcesList',
    async () => withRetry(async () => {
    const supabase = getSupabaseClient();
    let query = supabase
      .from("resources")
      .select(`
        *,
        author:users!resources_author_id_fkey(uuid, nickname, avatar_url),
        category:categories!resources_category_id_fkey(id, name, description)
      `);

    // 状态筛选
    if (params.status) {
      query = query.eq("status", params.status);
    } else {
      // 默认只显示已审核通过的资源
      query = query.eq("status", "approved");
    }

    // 分类筛选
    if (params.category) {
      query = query.eq("category_id", params.category);
    }

    // 标签筛选 - 使用安全的参数化查询
    if (params.tags && params.tags.length > 0) {
      // 验证标签参数
      const validTags = params.tags.filter(tag =>
        tag && typeof tag === 'string' && tag.trim().length > 0
      ).map(tag => tag.trim());

      if (validTags.length > 0) {
        // 使用安全的IN查询，通过标签名称查找资源
        const { data: tagIds, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .in('name', validTags);

        if (tagError) {
          log.error("查询标签ID失败", tagError, { tags: validTags });
          throw tagError;
        }

        if (tagIds && tagIds.length > 0) {
          const tagIdList = tagIds.map(t => t.id);

          // 查找包含这些标签的资源
          const { data: resourceIds, error: resourceError } = await supabase
            .from('resource_tags')
            .select('resource_id')
            .in('tag_id', tagIdList);

          if (resourceError) {
            log.error("查询标签资源关联失败", resourceError, { tagIds: tagIdList });
            throw resourceError;
          }

          if (resourceIds && resourceIds.length > 0) {
            const resourceIdList = resourceIds.map(r => r.resource_id);
            query = query.in('id', resourceIdList);
          } else {
            // 如果没有找到相关资源，返回空结果
            query = query.eq('id', -1); // 不存在的ID，确保返回空结果
          }
        } else {
          // 如果标签不存在，返回空结果
          query = query.eq('id', -1);
        }
      }
    }

    // 搜索 - 使用安全的参数化查询
    if (params.search) {
      const searchTerm = sanitizeSearchTerm(params.search);
      if (searchTerm.length > 0) {
        // 使用安全的搜索词进行查询
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
    }

    // 排序
    switch (params.sort) {
      case 'latest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
        query = query.order('access_count', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating_avg', { ascending: false });
        break;
      case 'views':
        query = query.order('view_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // 分页
    if (params.offset !== undefined) {
      query = query.range(params.offset, (params.offset + (params.limit || 20)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      log.error("获取资源列表失败", error, params);
      throw error;
    }

    return data || [];
    }),
    800 // 800ms慢查询阈值
  );
}

export async function incrementResourceViews(uuid: string) {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('increment_resource_views', { resource_uuid: uuid });

    if (error) {
      log.error("增加资源浏览量失败", error, { uuid });
      throw error;
    }
  });
}

export async function incrementResourceAccess(uuid: string) {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('increment_resource_access', { resource_uuid: uuid });

    if (error) {
      log.error("增加资源访问量失败", error, { uuid });
      throw error;
    }
  });
}

export async function updateResourceRatingStats(resourceId: number) {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    // 计算平均评分和评分数量
    const { data: stats, error: statsError } = await supabase
      .from("resource_ratings")
      .select("rating")
      .eq("resource_id", resourceId);

    if (statsError) {
      log.error("获取评分统计失败", statsError, { resourceId });
      throw statsError;
    }

    const ratings = stats || [];
    const ratingCount = ratings.length;
    const ratingAvg = ratingCount > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount 
      : 0;

    // 更新资源评分统计
    const { error: updateError } = await supabase
      .from("resources")
      .update({
        rating_avg: Math.round(ratingAvg * 100) / 100, // 保留两位小数
        rating_count: ratingCount
      })
      .eq("id", resourceId);

    if (updateError) {
      log.error("更新资源评分统计失败", updateError, { resourceId });
      throw updateError;
    }

    log.info("资源评分统计更新成功", { resourceId, ratingAvg, ratingCount });
  });
}

// 获取热门资源 (按访问次数排序)
export async function getPopularResources(limit: number = 6): Promise<ResourceWithDetails[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("resources")
      .select(`
        *,
        author:users!resources_author_id_fkey(uuid, nickname, avatar_url),
        category:categories!resources_category_id_fkey(id, name, description)
      `)
      .eq("status", "approved")
      .order("view_count", { ascending: false })
      .limit(limit);

    if (error) {
      log.error("获取热门资源失败", error);
      throw error;
    }

    return data || [];
  });
}

// 更新资源状态
export async function updateResourceStatus(uuid: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("resources")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("uuid", uuid);

    if (error) {
      log.error("更新资源状态失败", error, { uuid, status });
      throw error;
    }

    log.info("资源状态更新成功", { uuid, status });
  });
}



export async function getResourcesStats(): Promise<{
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  totalViews: number;
  totalAccess: number;
}> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();

    // 获取资源状态统计
    const { data: statusData, error: statusError } = await supabase
      .from("resources")
      .select("status, view_count, access_count");

    if (statusError) {
      log.error("获取资源统计失败", statusError);
      throw statusError;
    }

    const resources = statusData || [];
    const stats = {
      total: resources.length,
      approved: resources.filter(r => r.status === 'approved').length,
      pending: resources.filter(r => r.status === 'pending').length,
      rejected: resources.filter(r => r.status === 'rejected').length,
      totalViews: resources.reduce((sum, r) => sum + (r.view_count || 0), 0),
      totalAccess: resources.reduce((sum, r) => sum + (r.access_count || 0), 0),
    };

    log.info("资源统计获取成功", stats);
    return stats;
  });
}

export async function getResourceStatsByCategory(): Promise<{
  categoryId: number;
  categoryName: string;
  resourceCount: number;
  approvedCount: number;
  pendingCount: number;
}[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("resources")
      .select(`
        category_id,
        status,
        category:categories!resources_category_id_fkey(id, name)
      `);

    if (error) {
      log.error("获取分类资源统计失败", error);
      throw error;
    }

    const resources = data || [];

    // 按分类分组统计
    const categoryStats: { [categoryId: number]: any } = {};

    resources.forEach(resource => {
      const categoryId = resource.category_id;
      const categoryName = (resource.category as any)?.name || "未分类";

      if (!categoryStats[categoryId]) {
        categoryStats[categoryId] = {
          categoryId,
          categoryName,
          resourceCount: 0,
          approvedCount: 0,
          pendingCount: 0,
        };
      }

      categoryStats[categoryId].resourceCount++;
      if (resource.status === 'approved') {
        categoryStats[categoryId].approvedCount++;
      } else if (resource.status === 'pending') {
        categoryStats[categoryId].pendingCount++;
      }
    });

    const result = Object.values(categoryStats)
      .sort((a: any, b: any) => b.resourceCount - a.resourceCount);

    log.info("分类资源统计获取成功", { categoriesCount: result.length });
    return result;
  });
}

// 获取用户上传的资源列表
export async function getUserResources(params: {
  author_id: string;
  search?: string;
  status?: string;
  sort?: string;
  offset?: number;
  limit?: number;
}): Promise<ResourceWithDetails[]> {
  return wrapQueryWithMonitoring(
    'getUserResources',
    async () => withRetry(async () => {
      const supabase = getSupabaseClient();
      let query = supabase
        .from("resources")
        .select(`
          *,
          author:users!resources_author_id_fkey(uuid, nickname, avatar_url),
          category:categories!resources_category_id_fkey(id, name, description)
        `)
        .eq("author_id", params.author_id);

      // 状态筛选
      if (params.status) {
        query = query.eq("status", params.status);
      }

      // 搜索
      if (params.search) {
        const searchTerm = sanitizeSearchTerm(params.search);
        if (searchTerm.length > 0) {
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
      }

      // 排序
      switch (params.sort) {
        case 'popular':
          query = query.order('view_count', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating_avg', { ascending: false });
          break;
        case 'views':
          query = query.order('view_count', { ascending: false });
          break;
        case 'latest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // 分页
      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
      } else {
        query = query.limit(params.limit || 20);
      }

      const { data, error } = await query;

      if (error) {
        log.error("获取用户资源列表失败", error, params);
        throw error;
      }

      log.info("用户资源列表获取成功", {
        author_id: params.author_id,
        count: data?.length || 0,
        params
      });

      return data || [];
    }),
    800 // 800ms慢查询阈值
  );
}
