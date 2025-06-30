import { getSupabaseClient, withRetry } from "./db";
import { log } from "@/lib/logger";
import { Tag, ResourceTag } from "@/types/resource";

// 获取所有标签
export async function getAllTags(): Promise<Tag[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("usage_count", { ascending: false });
    
    if (error) {
      log.error("获取标签列表失败", error);
      throw error;
    }
    
    return data || [];
  });
}

// 获取热门标签
export async function getPopularTags(limit: number = 20): Promise<Tag[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("usage_count", { ascending: false })
      .limit(limit);
    
    if (error) {
      log.error("获取热门标签失败", error);
      throw error;
    }
    
    return data || [];
  });
}

// 根据名称搜索标签
export async function searchTags(query: string, limit: number = 10): Promise<Tag[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .ilike("name", `%${query}%`)
      .order("usage_count", { ascending: false })
      .limit(limit);
    
    if (error) {
      log.error("搜索标签失败", error, { query });
      throw error;
    }
    
    return data || [];
  });
}

// 获取单个标签
export async function getTagById(id: number): Promise<Tag | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      log.error("获取标签失败", error, { id });
      throw error;
    }

    return data;
  });
}

// 根据名称获取标签
export async function getTagByName(name: string): Promise<Tag | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("name", name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      log.error("根据名称获取标签失败", error, { name });
      throw error;
    }

    return data;
  });
}

// 创建标签
export async function createTag(tag: Omit<Tag, 'id' | 'created_at'>): Promise<Tag> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tags")
      .insert(tag)
      .select()
      .single();

    if (error) {
      log.error("创建标签失败", error, { tag });
      throw error;
    }

    log.info("标签创建成功", { tagId: data.id, name: tag.name });
    return data;
  });
}

// 创建或获取标签（如果不存在则创建）
export async function createOrGetTag(name: string, color?: string): Promise<Tag> {
  return withRetry(async () => {
    // 先尝试获取现有标签
    const existingTag = await getTagByName(name);
    if (existingTag) {
      return existingTag;
    }

    // 如果不存在则创建新标签
    return await createTag({
      name,
      color,
      usage_count: 0
    });
  });
}

// 更新标签
export async function updateTag(id: number, updates: Partial<Tag>): Promise<Tag> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tags")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      log.error("更新标签失败", error, { id, updates });
      throw error;
    }

    log.info("标签更新成功", { id, updates: Object.keys(updates) });
    return data;
  });
}

// 删除标签
export async function deleteTag(id: number): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    // 先删除关联的资源标签
    const { error: resourceTagError } = await supabase
      .from("resource_tags")
      .delete()
      .eq("tag_id", id);

    if (resourceTagError) {
      log.error("删除资源标签关联失败", resourceTagError, { id });
      throw resourceTagError;
    }

    // 删除标签
    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", id);

    if (error) {
      log.error("删除标签失败", error, { id });
      throw error;
    }

    log.info("标签删除成功", { id });
  });
}

// 获取资源的标签
export async function getResourceTags(resourceId: number): Promise<Tag[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("resource_tags")
      .select(`
        tag:tags(*)
      `)
      .eq("resource_id", resourceId);

    if (error) {
      log.error("获取资源标签失败", error, { resourceId });
      throw error;
    }

    return (data?.map(item => (item as any).tag).filter(Boolean) || []) as Tag[];
  });
}

// 为资源添加标签
export async function addResourceTags(resourceId: number, tagNames: string[]): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    // 创建或获取标签
    const tags = await Promise.all(
      tagNames.map(name => createOrGetTag(name.trim()))
    );

    // 创建资源标签关联
    const resourceTags = tags.map(tag => ({
      resource_id: resourceId,
      tag_id: tag.id!
    }));

    const { error } = await supabase
      .from("resource_tags")
      .upsert(resourceTags, { onConflict: 'resource_id,tag_id' });

    if (error) {
      log.error("添加资源标签失败", error, { resourceId, tagNames });
      throw error;
    }

    // 更新标签使用次数
    await Promise.all(
      tags.map(tag => incrementTagUsage(tag.id!))
    );

    log.info("资源标签添加成功", { resourceId, tagCount: tags.length });
  });
}

// 移除资源的所有标签
export async function removeResourceTags(resourceId: number): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    // 获取当前标签以便减少使用次数
    const currentTags = await getResourceTags(resourceId);
    
    // 删除资源标签关联
    const { error } = await supabase
      .from("resource_tags")
      .delete()
      .eq("resource_id", resourceId);

    if (error) {
      log.error("移除资源标签失败", error, { resourceId });
      throw error;
    }

    // 减少标签使用次数
    await Promise.all(
      currentTags.map(tag => decrementTagUsage(tag.id!))
    );

    log.info("资源标签移除成功", { resourceId, tagCount: currentTags.length });
  });
}

// 更新资源标签
export async function updateResourceTags(resourceId: number, tagNames: string[]): Promise<void> {
  return withRetry(async () => {
    // 先移除现有标签
    await removeResourceTags(resourceId);
    
    // 添加新标签
    if (tagNames.length > 0) {
      await addResourceTags(resourceId, tagNames);
    }
  });
}

// 增加标签使用次数
export async function incrementTagUsage(tagId: number): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('increment_tag_usage', { tag_id: tagId });

    if (error) {
      log.error("增加标签使用次数失败", error, { tagId });
      throw error;
    }
  });
}

// 减少标签使用次数
export async function decrementTagUsage(tagId: number): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('decrement_tag_usage', { tag_id: tagId });

    if (error) {
      log.error("减少标签使用次数失败", error, { tagId });
      throw error;
    }
  });
}

// 清理未使用的标签
export async function cleanupUnusedTags(): Promise<number> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tags")
      .delete()
      .eq("usage_count", 0)
      .select("id");

    if (error) {
      log.error("清理未使用标签失败", error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    log.info("清理未使用标签完成", { deletedCount });
    return deletedCount;
  });
}
