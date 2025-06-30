import { getSupabaseClient, withRetry } from "./db";
import { log } from "@/lib/logger";

export interface AuditLog {
  id?: number;
  uuid: string;
  user_uuid: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface AuditLogWithUser extends AuditLog {
  user?: {
    uuid: string;
    nickname?: string;
    email?: string;
  };
}

// 添加审计日志
export async function addAuditLog(auditLog: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("audit_logs")
      .insert(auditLog)
      .select()
      .single();
    
    if (error) {
      log.error("添加审计日志失败", error, auditLog);
      throw error;
    }
    
    log.debug("审计日志添加成功", { 
      logId: data.id,
      action: auditLog.action,
      userUuid: auditLog.user_uuid
    });
    
    return data;
  });
}

// 获取审计日志列表
export async function getAuditLogs(params: {
  user_uuid?: string;
  action?: string;
  resource_type?: string;
  offset?: number;
  limit?: number;
}): Promise<AuditLogWithUser[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from("audit_logs")
      .select(`
        *,
        user:users!audit_logs_user_uuid_fkey(uuid, nickname, email)
      `)
      .order("created_at", { ascending: false });

    if (params.user_uuid) {
      query = query.eq("user_uuid", params.user_uuid);
    }

    if (params.action) {
      query = query.eq("action", params.action);
    }

    if (params.resource_type) {
      query = query.eq("resource_type", params.resource_type);
    }

    if (params.offset !== undefined && params.limit !== undefined) {
      query = query.range(params.offset, params.offset + params.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      log.error("获取审计日志失败", error, params);
      throw error;
    }

    return data || [];
  });
}

// 获取审计日志统计
export async function getAuditLogStats(): Promise<{
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  topActions: Array<{ action: string; count: number }>;
}> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    // 获取总数
    const { count: total } = await supabase
      .from("audit_logs")
      .select("*", { count: 'exact', head: true });

    // 获取今天的数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from("audit_logs")
      .select("*", { count: 'exact', head: true })
      .gte("created_at", today.toISOString());

    // 获取本周的数量
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    thisWeek.setHours(0, 0, 0, 0);
    const { count: weekCount } = await supabase
      .from("audit_logs")
      .select("*", { count: 'exact', head: true })
      .gte("created_at", thisWeek.toISOString());

    // 获取本月的数量
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const { count: monthCount } = await supabase
      .from("audit_logs")
      .select("*", { count: 'exact', head: true })
      .gte("created_at", thisMonth.toISOString());

    // 获取热门操作
    const { data: actionsData } = await supabase
      .from("audit_logs")
      .select("action")
      .gte("created_at", thisMonth.toISOString());

    const actionCounts: { [key: string]: number } = {};
    actionsData?.forEach(item => {
      actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
    });

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: total || 0,
      today: todayCount || 0,
      thisWeek: weekCount || 0,
      thisMonth: monthCount || 0,
      topActions
    };
  });
}

// 清理旧的审计日志
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const { data, error } = await supabase
      .from("audit_logs")
      .delete()
      .lt("created_at", cutoffDate.toISOString())
      .select("id");

    if (error) {
      log.error("清理旧审计日志失败", error, { daysToKeep });
      throw error;
    }

    const deletedCount = data?.length || 0;
    log.info("清理旧审计日志完成", { deletedCount, daysToKeep });
    
    return deletedCount;
  });
}

// 根据UUID获取审计日志
export async function getAuditLogByUuid(uuid: string): Promise<AuditLogWithUser | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("audit_logs")
      .select(`
        *,
        user:users!audit_logs_user_uuid_fkey(uuid, nickname, email)
      `)
      .eq("uuid", uuid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      log.error("获取审计日志详情失败", error, { uuid });
      throw error;
    }

    return data;
  });
}

// 删除审计日志
export async function deleteAuditLog(uuid: string): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from("audit_logs")
      .delete()
      .eq("uuid", uuid);

    if (error) {
      log.error("删除审计日志失败", error, { uuid });
      throw error;
    }

    log.info("审计日志删除成功", { uuid });
  });
}

// 批量删除审计日志
export async function batchDeleteAuditLogs(uuids: string[]): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from("audit_logs")
      .delete()
      .in("uuid", uuids);

    if (error) {
      log.error("批量删除审计日志失败", error, { count: uuids.length });
      throw error;
    }

    log.info("批量删除审计日志成功", { count: uuids.length });
  });
}
