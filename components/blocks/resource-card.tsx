"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Download,
  Eye,
  Star,
  Heart,
  Share2,
  FileText,
  ImageIcon,
  Music,
  Video,
  Code,
  MoreHorizontal,
  Tag
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResourceWithDetails } from "@/types/resource";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

// 格式化数字显示
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";

// 移除文件类型图标映射和文件大小格式化函数

// 渲染星级评分 - 按照原型图样式
function StarRating({ rating, count, showCount = true }: {
  rating: number;
  count: number;
  showCount?: boolean;
}) {
  return (
    <div className="flex items-center space-x-2">
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= rating ? "★" : "☆"}
          </span>
        ))}
      </div>
      {showCount && (
        <span className="text-sm text-muted">
          {rating.toFixed(1)} {count > 0 && `(${count}评价)`}
        </span>
      )}
    </div>
  );
}

interface ResourceCardProps {
  resource: ResourceWithDetails;
  variant?: "default" | "compact" | "detailed";
  showAuthor?: boolean;
  showActions?: boolean;
  onFavorite?: (resource: ResourceWithDetails) => void;
  onShare?: (resource: ResourceWithDetails) => void;
}

export default function ResourceCard({
  resource,
  variant = "default",
  showAuthor = true,
  showActions = true,
  onFavorite,
  onShare
}: ResourceCardProps) {
  const t = useTranslations();
  const { user } = useAppContext();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteStatusLoaded, setFavoriteStatusLoaded] = useState(false);

  // 获取收藏状态
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!user || !resource.uuid) return;

      try {
        const response = await fetch(`/api/resources/${resource.uuid}/favorite-status`);
        const result = await response.json();

        if (result.code === 0) {
          setIsFavorited(result.data.favorited);
        }
      } catch (error) {
        console.error("获取收藏状态失败:", error);
      } finally {
        setFavoriteStatusLoaded(true);
      }
    };

    fetchFavoriteStatus();
  }, [user, resource.uuid]);

  // 移除文件类型图标相关代码

  const handleFavorite = async () => {
    if (!user) {
      toast.error("请先登录");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/resources/${resource.uuid}/favorite`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.code === 0) {
        setIsFavorited(result.data.favorited);
        toast.success(result.data.message);
        // 收藏状态已在组件内部管理，无需调用父组件回调
        // onFavorite?.(resource);
      } else {
        throw new Error(result.message || '操作失败');
      }

    } catch (error) {
      console.error("收藏操作失败:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("操作失败，请稍后再试");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/resources/${resource.uuid}`;
      
      if (navigator.share) {
        await navigator.share({
          title: resource.title,
          text: resource.description,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("链接已复制到剪贴板");
      }
      
      onShare?.(resource);
    } catch (error) {
      console.error("分享失败:", error);
      toast.error("分享失败");
    }
  };

  const [isAccessing, setIsAccessing] = useState(false);

  const handleAccess = async () => {
    if (!resource.file_url) return;

    try {
      setIsAccessing(true);

      // 如果是付费资源且用户未登录，提示登录
      if (!resource.is_free && !user) {
        toast.error("付费资源需要登录后访问");
        return;
      }

      // 调用访问API，先扣除积分再跳转
      const response = await fetch(`/api/resources/${resource.uuid}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`访问请求失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(data.message || '访问失败');
      }

      // 只有API调用成功后才打开资源链接
      window.open(resource.file_url, '_blank');

      // 显示成功消息
      if (resource.is_free) {
        toast.success("正在打开免费资源...");
      } else {
        toast.success(`已扣除${resource.credits}积分，正在打开资源...`);
      }

    } catch (error) {
      console.error("访问失败:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("访问失败，请稍后再试");
      }
    } finally {
      setIsAccessing(false);
    }
  };

  if (variant === "compact") {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <Link href={`/resources/${resource.uuid}`}>
                <h4 className="font-medium text-sm line-clamp-1 hover:text-primary">
                  {resource.title}
                </h4>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={resource.rating_avg} count={resource.rating_count} showCount={false} />
                <span className="text-xs text-muted-foreground">
                  {resource.access_count} 访问
                </span>
              </div>
            </div>
            {resource.is_free ? (
              <Badge variant="secondary" className="text-xs">免费</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">{resource.credits || 0}积分</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="card p-4 lg:p-6 cursor-pointer" onClick={() => window.location.href = `/resources/${resource.uuid}`}>
      {/* 标题区域 - 完全按照原型图 */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-base lg:text-lg line-clamp-1 flex-1 mr-2">
          {resource.title}
        </h3>
        {showActions && (
          <button
            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 touch-target"
            onClick={(e) => {
              e.stopPropagation();
              handleFavorite();
            }}
            disabled={isLoading || !favoriteStatusLoaded}
            title={isFavorited ? "取消收藏" : "收藏"}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? "fill-red-500 text-red-500" : ""} ${!favoriteStatusLoaded ? "opacity-50" : ""}`} />
          </button>
        )}
      </div>

      {/* 描述 - 按照原型图，固定高度确保布局统一 */}
      <p className="text-sm text-muted mb-4 line-clamp-2 h-10 flex items-start">
        {resource.description || "暂无描述"}
      </p>

      {/* 评分和访问量 - 按照原型图 */}
      <div className="flex items-center justify-between mb-4">
        <StarRating rating={resource.rating_avg} count={resource.rating_count} />
        <span className="text-sm text-muted">访问 {formatNumber(resource.access_count || 0)}</span>
      </div>

      {/* 标签 - 按照原型图 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {resource.tags && resource.tags.length > 0 ? (
          resource.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="badge-secondary">
              {typeof tag === 'string' ? tag : tag.name}
            </span>
          ))
        ) : (
          resource.category && (
            <span className="badge-secondary">
              {resource.category.name}
            </span>
          )
        )}
        {resource.tags && resource.tags.length > 3 && (
          <span className="badge-secondary">
            +{resource.tags.length - 3}
          </span>
        )}
      </div>

      {/* 底部区域 - 完全按照原型图 */}
      <div className="flex items-center justify-between">
        {/* 左侧：作者信息 */}
        <div className="flex items-center space-x-2">
          <img
            src={resource.author?.avatar_url || "https://pub-7d345f4cf2334fce864509d66ec976f3.r2.dev/avatars/momo.jpg"}
            alt="上传者"
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm text-muted">
            {resource.author?.nickname || "匿名用户"}
          </span>
        </div>

        {/* 右侧：访问按钮 */}
        <div className="relative">
          <button
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              handleAccess();
            }}
            disabled={isAccessing}
          >
            {isAccessing ? "访问中..." : "访问资源"}
          </button>
          {/* 积分消耗小标签 */}
          {!resource.is_free && (
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold shadow-lg border border-white transform rotate-12">
              {resource.credits}积分
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
