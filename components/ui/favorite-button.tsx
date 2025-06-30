"use client";

import { useState, useEffect } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";

interface FavoriteButtonProps {
  resourceUuid: string; // 统一使用资源UUID
  initialFavorited?: boolean;
  onToggle?: (favorited: boolean) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  className?: string;
}

export function FavoriteButton({
  resourceUuid,
  initialFavorited = false,
  onToggle,
  variant = "outline",
  size = "default",
  showText = false,
  className
}: FavoriteButtonProps) {
  const { user } = useAppContext();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteStatusLoaded, setFavoriteStatusLoaded] = useState(false);

  // 获取收藏状态
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!user || !resourceUuid) {
        setFavoriteStatusLoaded(true);
        return;
      }

      try {
        const response = await fetch(`/api/resources/${resourceUuid}/favorite-status`);
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
  }, [user, resourceUuid]);

  const handleToggle = async () => {
    if (!user) {
      toast.error("请先登录");
      return;
    }

    if (!resourceUuid) {
      toast.error("资源信息不完整");
      return;
    }

    try {
      setIsLoading(true);

      // 使用统一的收藏切换接口
      const response = await fetch(`/api/resources/${resourceUuid}/favorite`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.code === 0) {
        setIsFavorited(result.data.favorited);
        toast.success(result.data.message);
        onToggle?.(result.data.favorited);
      } else {
        throw new Error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('登录')) {
          toast.error("请先登录");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("操作失败，请稍后再试");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    default: "h-4 w-4",
    sm: "h-3 w-3",
    lg: "h-5 w-5",
    icon: "h-4 w-4"
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "transition-colors",
        showText ? "gap-2" : "",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className={cn(sizeClasses[size], "animate-spin")} />
      ) : (
        <Heart
          className={cn(
            sizeClasses[size],
            isFavorited 
              ? "fill-red-500 text-red-500" 
              : "text-current"
          )}
        />
      )}
      {showText && (
        <span>{isFavorited ? "已收藏" : "收藏"}</span>
      )}
    </Button>
  );
}

// 简化的收藏图标组件
export function FavoriteIcon({
  favorited,
  size = "default",
  className
}: {
  favorited: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const sizeClasses = {
    default: "h-4 w-4",
    sm: "h-3 w-3",
    lg: "h-5 w-5",
    icon: "h-4 w-4"
  };

  return (
    <Heart
      className={cn(
        sizeClasses[size],
        favorited 
          ? "fill-red-500 text-red-500" 
          : "text-muted-foreground",
        className
      )}
    />
  );
}
