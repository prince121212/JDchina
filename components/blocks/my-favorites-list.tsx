"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  Eye, 
  Star, 
  Heart,
  Search,
  FileText, 
  ImageIcon, 
  Music, 
  Video, 
  Code
} from "lucide-react";
import { FavoriteWithResource } from "@/models/favorite";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

// 移除文件类型图标映射，统一使用文档图标

// 渲染星级评分
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= rating 
              ? "fill-yellow-400 text-yellow-400" 
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

// 收藏资源卡片组件
function FavoriteCard({ favorite, onRemove }: { 
  favorite: FavoriteWithResource; 
  onRemove: (favorite: FavoriteWithResource) => void;
}) {
  if (!favorite.resource) return null;
  
  const resource = favorite.resource;
  const FileIcon = FileText; // 统一使用文档图标

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* 文件类型图标 */}
          <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          
          {/* 资源信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-base line-clamp-1 mb-1">
                  {resource.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {resource.description}
                </p>
              </div>
            </div>
            
            {/* 统计信息 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {resource.access_count} 访问
              </div>
              <StarRating rating={resource.rating_avg} />
              <span>
                收藏于 {formatDistanceToNow(new Date(favorite.created_at!), { 
                  addSuffix: true, 
                  locale: zhCN 
                })}
              </span>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {resource.category?.name || '未分类'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  发布于 {formatDistanceToNow(new Date(resource.created_at), {
                    addSuffix: true,
                    locale: zhCN
                  })}
                </span>
              </div>

              {/* 移动端：上下排列，桌面端：左右排列 */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                <Link href={`/resources/${resource.uuid}`}>
                  <Button variant="outline" size="sm" className="px-3">
                    查看详情
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(favorite)}
                  className="w-8 h-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyFavoritesList() {
  const t = useTranslations();
  const [favorites, setFavorites] = useState<FavoriteWithResource[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteWithResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("latest");

  useEffect(() => {
    fetchMyFavorites();
  }, []);

  useEffect(() => {
    let filtered = [...favorites];
    
    // 搜索筛选
    if (searchQuery.trim()) {
      filtered = filtered.filter(favorite =>
        favorite.resource?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        favorite.resource?.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 排序
    switch (sortBy) {
      case 'latest':
        filtered.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.resource?.access_count || 0) - (a.resource?.access_count || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.resource?.rating_avg || 0) - (a.resource?.rating_avg || 0));
        break;
    }
    
    setFilteredFavorites(filtered);
  }, [favorites, searchQuery, sortBy]);

  const fetchMyFavorites = async () => {
    try {
      setLoading(true);
      // TODO: 实现API调用
      const response = await fetch('/api/my-favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      } else {
        // 如果API不存在或失败，显示空列表
        setFavorites([]);
      }
    } catch (error) {
      console.error("获取我的收藏失败:", error);
      toast.error("获取收藏列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favorite: FavoriteWithResource) => {
    try {
      // 调用取消收藏API
      const response = await fetch(`/api/favorites/${favorite.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(f => f.id !== favorite.id));
        toast.success("已取消收藏");
      } else {
        const result = await response.json();
        throw new Error(result.message || '取消收藏失败');
      }
    } catch (error) {
      console.error("取消收藏失败:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("取消收藏失败，请稍后再试");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-muted rounded-lg animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-1/4 animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 搜索和排序 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索我的收藏..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">最新收藏</SelectItem>
            <SelectItem value="oldest">最早收藏</SelectItem>
            <SelectItem value="popular">最多下载</SelectItem>
            <SelectItem value="rating">最高评分</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计信息 */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{favorites.length}</div>
            <div className="text-sm text-muted-foreground">个收藏资源</div>
          </div>
        </CardContent>
      </Card>

      {/* 收藏列表 */}
      {filteredFavorites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="text-muted-foreground mb-4">
              {searchQuery 
                ? "没有找到匹配的收藏资源" 
                : "您还没有收藏任何资源"}
            </div>
            {!searchQuery && (
              <Link href="/resources">
                <Button>
                  去发现资源
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFavorites.map((favorite) => (
            <FavoriteCard
              key={favorite.id}
              favorite={favorite}
              onRemove={handleRemoveFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
