// 资源相关类型定义

export interface Resource {
  id?: number;
  uuid: string;
  title: string;
  description: string;
  content?: string;
  file_url?: string;
  category_id: number;
  author_id: string;
  status: 'pending' | 'approved' | 'rejected';
  rating_avg: number;
  rating_count: number;
  view_count: number;
  access_count: number;
  is_featured: boolean;
  is_free: boolean;
  credits?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ResourceWithDetails extends Resource {
  author?: {
    uuid: string;
    nickname?: string;
    avatar_url?: string;
  };
  category?: {
    id: number;
    name: string;
    description?: string;
    icon?: string;
    slug?: string;
  };
  tags?: Array<{
    id: number;
    name: string;
    color?: string;
  }>;
}

export interface Category {
  id?: number;
  name: string;
  description?: string;
  parent_id?: number;
  icon?: string;
  sort_order: number;
  resource_count?: number;
  created_at?: string;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

export interface Tag {
  id?: number;
  name: string;
  color?: string;
  usage_count: number;
  created_at?: string;
}

export interface ResourceTag {
  resource_id: number;
  tag_id: number;
}

export interface UserFavorite {
  id?: number;
  user_uuid: string;
  resource_id: number;
  created_at?: string;
}

export interface ResourceRating {
  id?: number;
  user_uuid: string;
  resource_id: number;
  rating: number; // 1-5
  created_at?: string;
}

export interface AccessHistory {
  id?: number;
  user_uuid: string;
  resource_id: number;
  credits_cost: number;
  created_at?: string;
}

export interface ResourceComment {
  id?: number;
  uuid: string;
  resource_id: number;
  user_uuid: string;
  content: string;
  parent_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface ResourceCommentWithDetails extends ResourceComment {
  author?: {
    uuid: string;
    nickname?: string;
    avatar_url?: string;
  };
  replies?: ResourceCommentWithDetails[];
}

// 搜索和筛选参数
export interface ResourceSearchParams {
  category?: string;
  tags?: string[];
  search?: string;
  sort?: 'latest' | 'popular' | 'rating' | 'views';
  status?: 'pending' | 'approved' | 'rejected';
  is_free?: boolean;
  rating_min?: number;
  offset?: number;
  limit?: number;
}

// 资源统计信息
export interface ResourceStats {
  total_resources: number;
  total_access: number;
  total_views: number;
  total_categories: number;
  total_tags: number;
  avg_rating: number;
}

// 上传资源表单数据
export interface ResourceUploadForm {
  title: string;
  description: string;
  content?: string;
  category_id: number;
  tags: string[];
  file?: File;
  is_free: boolean;
  credits?: number;
}

// 资源审核操作
export interface ResourceModerationAction {
  resource_uuid: string;
  action: 'approve' | 'reject';
  reason?: string;
  moderator_uuid: string;
}

// 资源导出格式
export interface ResourceExport {
  uuid: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  status: string;
  rating_avg: number;
  access_count: number;
  view_count: number;
  created_at: string;
}
