import { getSupabaseClient, withRetry } from "./db";
import { log } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import { ResourceComment, ResourceCommentWithDetails } from "@/types/resource";

// 扩展ResourceCommentWithDetails以包含reply_count
export interface ResourceCommentWithDetailsExtended extends ResourceCommentWithDetails {
  reply_count?: number;
}

// 添加评论
export async function addResourceComment(comment: Omit<ResourceComment, 'id' | 'uuid' | 'created_at' | 'updated_at'>): Promise<ResourceComment> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const newComment = {
      ...comment,
      uuid: uuidv4(),
      status: 'approved' as const, // 暂时自动审核通过，后续可以改为 'pending'
    };

    const { data, error } = await supabase
      .from("resource_comments")
      .insert(newComment)
      .select()
      .single();
    
    if (error) {
      log.error("添加评论失败", error, comment);
      throw error;
    }
    
    log.info("评论添加成功", { 
      commentId: data.id,
      resourceId: comment.resource_id, 
      userUuid: comment.user_uuid,
      parentId: comment.parent_id
    });
    
    return data;
  });
}

// 获取资源的评论列表
export async function getResourceComments(
  resourceId: number,
  offset?: number,
  limit?: number
): Promise<ResourceCommentWithDetailsExtended[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from("resource_comments")
      .select(`
        *,
        author:users!resource_comments_user_uuid_fkey(uuid, nickname, avatar_url)
      `)
      .eq("resource_id", resourceId)
      .eq("status", "approved")
      .is("parent_id", null) // 只获取顶级评论
      .order("created_at", { ascending: false });

    if (offset !== undefined && limit !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      log.error("获取资源评论失败", error, { resourceId });
      throw error;
    }

    const comments = data || [];

    // 获取每个评论的回复
    for (const comment of comments) {
      if (comment.id) {
        comment.replies = await getCommentReplies(comment.id);
        comment.reply_count = comment.replies.length;
      }
    }

    return comments;
  });
}

// 获取评论的回复
export async function getCommentReplies(parentId: number): Promise<ResourceCommentWithDetails[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("resource_comments")
      .select(`
        *,
        author:users!resource_comments_user_uuid_fkey(uuid, nickname, avatar_url)
      `)
      .eq("parent_id", parentId)
      .eq("status", "approved")
      .order("created_at", { ascending: true }); // 回复按时间正序

    if (error) {
      log.error("获取评论回复失败", error, { parentId });
      throw error;
    }

    return data || [];
  });
}

// 获取评论详情
export async function getCommentById(commentId: number): Promise<ResourceCommentWithDetails | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("resource_comments")
      .select(`
        *,
        author:users!resource_comments_user_uuid_fkey(uuid, nickname, avatar_url)
      `)
      .eq("id", commentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      log.error("获取评论详情失败", error, { commentId });
      throw error;
    }

    return data;
  });
}

// 获取评论详情（通过UUID）
export async function getCommentByUuid(uuid: string): Promise<ResourceCommentWithDetails | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("resource_comments")
      .select(`
        *,
        author:users!resource_comments_user_uuid_fkey(uuid, nickname, avatar_url)
      `)
      .eq("uuid", uuid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      log.error("获取评论详情失败", error, { uuid });
      throw error;
    }

    return data;
  });
}

// 更新评论
export async function updateComment(uuid: string, updates: Partial<Pick<ResourceComment, 'content' | 'status'>>): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from("resource_comments")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("uuid", uuid);

    if (error) {
      log.error("更新评论失败", error, { uuid, updates });
      throw error;
    }

    log.info("评论更新成功", { uuid, updates });
  });
}

// 删除评论
export async function deleteComment(uuid: string): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from("resource_comments")
      .delete()
      .eq("uuid", uuid);

    if (error) {
      log.error("删除评论失败", error, { uuid });
      throw error;
    }

    log.info("评论删除成功", { uuid });
  });
}

// 获取用户的评论列表
export async function getUserComments(
  userUuid: string, 
  offset?: number, 
  limit?: number
): Promise<ResourceCommentWithDetails[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from("resource_comments")
      .select(`
        *,
        author:users!resource_comments_user_uuid_fkey(uuid, nickname, avatar_url)
      `)
      .eq("user_uuid", userUuid)
      .order("created_at", { ascending: false });

    if (offset !== undefined && limit !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      log.error("获取用户评论失败", error, { userUuid });
      throw error;
    }

    return data || [];
  });
}

// 获取评论统计
export async function getCommentStats(resourceId: number): Promise<{
  total: number;
  approved: number;
  pending: number;
}> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("resource_comments")
      .select("status")
      .eq("resource_id", resourceId);

    if (error) {
      log.error("获取评论统计失败", error, { resourceId });
      throw error;
    }

    const comments = data || [];
    const stats = {
      total: comments.length,
      approved: comments.filter(c => c.status === 'approved').length,
      pending: comments.filter(c => c.status === 'pending').length,
    };

    return stats;
  });
}

// 获取资源的评论总数
export async function getResourceCommentsCount(resourceId: number): Promise<number> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from("resource_comments")
      .select("*", { count: 'exact', head: true })
      .eq("resource_id", resourceId)
      .eq("status", "approved");

    if (error) {
      log.error("获取评论总数失败", error, { resourceId });
      throw error;
    }

    return count || 0;
  });
}
