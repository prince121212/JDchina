import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// 通用的加载组件
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="h-4 bg-muted rounded w-3/4"></div>
    <div className="h-4 bg-muted rounded w-1/2"></div>
    <div className="h-4 bg-muted rounded w-5/6"></div>
  </div>
);

// 动态导入配置
const dynamicConfig = {
  loading: LoadingSpinner,
  ssr: false, // 默认关闭SSR以提高性能
};

// 管理后台相关组件（懒加载）
export const DynamicAdminComponents = {
  // 分类表单组件（实际存在）
  CategoryForm: dynamic(() => import('@/components/admin/category-form'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 分类操作组件（实际存在）
  CategoryActions: dynamic(() => import('@/components/admin/category-actions'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 标签操作组件（实际存在）
  TagActions: dynamic(() => import('@/components/admin/tag-actions'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 待审核资源操作组件（实际存在）
  PendingResourceActions: dynamic(() => import('@/components/admin/pending-resource-actions'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 系统管理组件（实际存在）
  SystemManagement: dynamic(() => import('@/components/admin/system-management'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),
};

// 用户界面相关组件（懒加载）
export const DynamicUserComponents = {
  // 资源上传表单组件（实际存在）
  ResourceUploadForm: dynamic(() => import('@/components/blocks/resource-upload-form'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 资源详情组件（实际存在）
  ResourceDetail: dynamic(() => import('@/components/blocks/resource-detail'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 评论组件（实际存在）
  CommentSection: dynamic(() => import('@/components/blocks/comment-section'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 个人资料表单组件（实际存在）
  ProfileForm: dynamic(() => import('@/components/profile/profile-form'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 个人资料标签页组件（实际存在）
  ProfileTabs: dynamic(() => import('@/components/blocks/profile-tabs'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 我的收藏列表组件（实际存在）
  MyFavoritesList: dynamic(() => import('@/components/blocks/my-favorites-list'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  // 我的上传列表组件（实际存在）
  MyUploadsList: dynamic(() => import('@/components/blocks/my-uploads-list'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),
};

// 性能监控组件（懒加载）
export const DynamicPerformanceComponents = {
  PerformanceMonitor: dynamic(() => import('@/components/performance/performance-monitor').then(mod => ({ default: mod.PerformanceMonitor })), {
    ssr: false,
    loading: () => null, // 性能监控组件不需要加载状态
  }),
  
  VirtualList: dynamic(() => import('@/components/performance/virtual-list').then(mod => ({ default: mod.VirtualList })), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),
};

// 第三方库的动态导入（暂时注释掉，因为这些库可能没有安装）
export const DynamicLibraries = {
  // // 图表库
  // Chart: dynamic(() => import('react-chartjs-2').then(mod => mod.Chart), {
  //   ...dynamicConfig,
  //   loading: () => <div className="h-64 bg-muted rounded animate-pulse"></div>,
  // }),

  // // 代码编辑器
  // CodeEditor: dynamic(() => import('@monaco-editor/react').then(mod => mod.default), {
  //   ...dynamicConfig,
  //   loading: () => <div className="h-96 bg-muted rounded animate-pulse"></div>,
  // }),
  
  // 移除文件预览器，资源站不需要文件预览功能
};

// 工具函数：创建带错误边界的动态组件
export function createDynamicComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    loading?: () => React.ReactElement | null;
    fallback?: ComponentType<T>;
    ssr?: boolean;
  } = {}
) {
  const {
    loading = () => <LoadingSpinner />,
    fallback,
    ssr = false,
  } = options;

  return dynamic(
    () => importFn().catch(() => {
      console.warn('动态组件加载失败，使用回退组件');
      return { 
        default: fallback || (() => (
          <div className="p-4 text-center text-muted-foreground">
            组件加载失败，请刷新页面重试
          </div>
        ))
      };
    }),
    {
      loading,
      ssr,
    }
  );
}

// 预加载函数
export const preloadComponents = {
  // 预加载管理后台组件
  admin: () => {
    if (typeof window !== 'undefined') {
      // 在空闲时预加载
      requestIdleCallback(() => {
        import('@/components/admin/category-form');
        import('@/components/admin/system-management');
      });
    }
  },

  // 预加载用户组件
  user: () => {
    if (typeof window !== 'undefined') {
      requestIdleCallback(() => {
        import('@/components/blocks/resource-upload-form');
        import('@/components/profile/profile-form');
      });
    }
  },
  
  // 预加载性能组件
  performance: () => {
    if (typeof window !== 'undefined') {
      requestIdleCallback(() => {
        import('@/components/performance/virtual-list');
      });
    }
  },
};

// 路由级别的代码分割
export const DynamicPages = {
  // 管理后台页面
  AdminDashboard: dynamic(() => import('@/app/[locale]/(admin)/admin/page'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),
  
  AdminResources: dynamic(() => import('@/app/[locale]/(admin)/admin/resources/page'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),
  
  AdminStatistics: dynamic(() => import('@/app/[locale]/(admin)/admin/statistics/page'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),
  
  // 用户页面
  ResourcesPage: dynamic(() => import('@/app/[locale]/(default)/resources/page'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),

  UserCenter: dynamic(() => import('@/app/[locale]/(default)/user-center/page'), {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  }),
};

// 条件加载：根据用户权限动态加载组件
export function createConditionalComponent<T = {}>(
  condition: () => boolean,
  componentImport: () => Promise<{ default: ComponentType<T> }>,
  fallbackComponent?: ComponentType<T>
) {
  if (!condition()) {
    return fallbackComponent || (() => null);
  }
  
  return dynamic(componentImport, {
    ...dynamicConfig,
    loading: () => <LoadingSkeleton />,
  });
}

// 性能优化：组件懒加载Hook
export function useLazyComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  trigger: boolean = true
) {
  if (!trigger) {
    return null;
  }
  
  return createDynamicComponent(importFn);
}
