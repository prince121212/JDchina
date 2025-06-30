/**
 * 积分记录相关的类型定义
 */

/**
 * 基础积分记录接口
 */
export interface Credit {
  id: number;
  trans_no: string;
  created_at: string;
  user_uuid: string;
  trans_type: string;
  credits: number;
  order_no: string;
  expired_at: string | null;
}

/**
 * 资源信息接口
 */
export interface ResourceInfo {
  uuid: string;
  title: string;
  is_free: boolean;
  credits: number;
  file_url: string;
  category_id?: number;
  description?: string;
  file_size?: number;
  download_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * 增强的积分记录接口（包含资源信息）
 */
export interface EnrichedCredit extends Credit {
  resource?: ResourceInfo | null;
}
