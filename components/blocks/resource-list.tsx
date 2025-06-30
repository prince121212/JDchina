"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { ResourceWithDetails, ResourceSearchParams } from "@/types/resource";
import ResourceCard from "./resource-card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ResourceListProps {
  initialFilters?: Partial<ResourceSearchParams>;
  showPagination?: boolean;
  pageSize?: number;
  variant?: "default" | "compact" | "detailed";
}

export default function ResourceList({
  initialFilters = {},
  showPagination = true,
  pageSize = 20,
  variant = "default"
}: ResourceListProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [resources, setResources] = useState<ResourceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 获取当前筛选参数
  const getFilters = (): ResourceSearchParams => {
    return {
      category: searchParams.get('category') || initialFilters.category || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || initialFilters.tags || [],
      search: searchParams.get('search') || initialFilters.search || undefined,
      sort: (searchParams.get('sort') || initialFilters.sort || 'latest') as 'latest' | 'popular' | 'rating' | 'views',

      is_free: searchParams.get('is_free') === 'true' ? true :
                searchParams.get('is_free') === 'false' ? false :
                initialFilters.is_free,
      rating_min: searchParams.get('rating_min') ?
                   parseInt(searchParams.get('rating_min')!) :
                   initialFilters.rating_min,
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
    };
  };

  // 获取资源列表
  const fetchResources = async () => {
    try {
      setLoading(true);
      const filters = getFilters();

      // 构建查询参数
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              queryParams.set(key, value.join(','));
            }
          } else {
            queryParams.set(key, value.toString());
          }
        }
      });

      const url = `/api/resources?${queryParams.toString()}`;
      console.log('正在请求资源列表:', url);
      console.log('筛选参数:', filters);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API响应错误:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || '获取资源列表失败'}`);
      }

      const data = await response.json();
      console.log('API响应数据:', data);

      if (data.code === 0) {
        setResources(data.data.resources || []);
        setTotalCount(data.data.total || 0);
        setTotalPages(Math.ceil((data.data.total || 0) / pageSize));
        console.log('资源列表加载成功:', data.data.resources?.length || 0, '条');
      } else {
        throw new Error(data.message || '获取资源列表失败');
      }
    } catch (error) {
      console.error('获取资源列表失败:', error);
      toast.error(`获取资源列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setResources([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [searchParams, currentPage, pageSize]);

  // 更新URL参数
  const updateSearchParams = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateSearchParams({ page: page.toString() });
  };



  const handleFavorite = (resource: ResourceWithDetails) => {
    // 收藏状态已在ResourceCard组件内部管理，无需重新获取列表
    // 如果需要，可以在这里添加其他逻辑，比如更新全局状态
    console.log('资源收藏状态已更新:', resource.title);
  };

  const handleShare = (resource: ResourceWithDetails) => {
    // 分享操作完成后的处理
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 结果统计 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            找到 {totalCount} 个资源
          </p>
        </div>
      </div>

      {/* 资源列表 */}
      {resources.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">暂无资源</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.uuid}
              resource={resource}
              variant={variant}
              showAuthor={true}
              showActions={true}
              onFavorite={handleFavorite}
              onShare={handleShare}
            />
          ))}
        </div>
      )}

      {/* 分页 - 参考原型图样式 */}
      {showPagination && totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="px-3 py-2"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              上一页
            </Button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  className="px-3 py-2"
                  onClick={() => handlePageChange(page)}
                  disabled={loading}
                >
                  {page}
                </Button>
              );
            })}

            {totalPages > 5 && (
              <>
                <span className="px-2 py-2 text-muted-foreground">...</span>
                <Button
                  variant={currentPage === totalPages ? "default" : "outline"}
                  className="px-3 py-2"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={loading}
                >
                  {totalPages}
                </Button>
              </>
            )}

            <Button
              variant="outline"
              className="px-3 py-2"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
