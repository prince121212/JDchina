"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  Calendar,
  User,
  Tag,
  Folder
} from "lucide-react";
import { ResourceWithDetails } from "@/types/resource";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { RatingDisplay, RatingInput } from "@/components/ui/rating";
import RatingStats from "@/components/ui/rating-stats";
import CommentSection, { CommentSectionRef } from "@/components/blocks/comment-section";
import { useAppContext } from "@/contexts/app";
import { toast } from "sonner";

interface ResourceDetailProps {
  resourceUuid: string;
}

// 移除文件类型图标映射

// 移除文件大小格式化函数

// 渲染星级评分
function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating 
              ? "fill-yellow-400 text-yellow-400" 
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="text-sm text-muted-foreground ml-1">
        ({count} 评价)
      </span>
    </div>
  );
}

export default function ResourceDetail({ resourceUuid }: ResourceDetailProps) {
  const t = useTranslations();
  const { user } = useAppContext();
  const [resource, setResource] = useState<ResourceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAccessing, setIsAccessing] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [authorStats, setAuthorStats] = useState<{
    uploadedResourcesCount: number;
    totalVisitors: number;
  } | null>(null);

  // 防止重复请求的ref
  const fetchingResource = useRef(false);
  const lastResourceUuid = useRef<string | null>(null);

  // 评论组件的ref
  const commentSectionRef = useRef<CommentSectionRef>(null);

  // 获取作者统计信息
  const fetchAuthorStats = async (authorUuid: string) => {
    try {
      const response = await fetch(`/api/users/${authorUuid}/stats`);
      if (response.ok) {
        const data = await response.json();
        if (data.code === 0) {
          setAuthorStats(data.data.stats);
        }
      }
    } catch (error) {
      console.error("获取作者统计信息失败:", error);
    }
  };

  // 获取资源详情 - 只依赖resourceUuid，防止重复调用
  useEffect(() => {
    // 如果resourceUuid没有变化，不重复请求
    if (lastResourceUuid.current === resourceUuid) {
      return;
    }

    lastResourceUuid.current = resourceUuid;
    fetchResource();
  }, [resourceUuid]);

  // 获取用户评分 - 只在用户登录且资源加载完成后执行
  useEffect(() => {
    if (user && resource?.id) {
      fetchUserRating();
    }
  }, [user, resource?.id]);

  const fetchResource = async () => {
    // 防止重复请求
    if (fetchingResource.current) {
      return;
    }

    try {
      fetchingResource.current = true;
      setLoading(true);
      const response = await fetch(`/api/resources/${resourceUuid}`);
      const data = await response.json();

      if (data.code === 0 && data.data?.resource) {
        setResource(data.data.resource);
        // 获取作者统计信息
        if (data.data.resource.author?.uuid) {
          fetchAuthorStats(data.data.resource.author.uuid);
        }
      } else {
        throw new Error(data.message || '获取资源详情失败');
      }
    } catch (error) {
      console.error("获取资源详情失败:", error);
      // 如果API失败，不显示任何资源数据
      setResource(null);
    } finally {
      setLoading(false);
      fetchingResource.current = false;
    }
  };

  const fetchUserRating = async () => {
    if (!user || !resource?.id) return;

    try {
      const response = await fetch(`/api/ratings?resource_id=${resource.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.code === 0) {
          setUserRating(data.data.rating || 0);
          setHasRated(data.data.has_rated || false);
        }
      }
    } catch (error) {
      console.error("获取用户评分失败:", error);
    }
  };

  const handleRatingChange = async (rating: number) => {
    setUserRating(rating);
  };

  const handleSubmitComment = async () => {
    if (!user || !resource?.id) {
      toast.error("请先登录");
      return;
    }

    if (userRating === 0) {
      toast.error("请先选择评分");
      return;
    }

    if (!comment.trim()) {
      toast.error("请输入评价内容");
      return;
    }

    try {
      setIsSubmittingComment(true);

      // 1. 先提交评分
      const ratingResponse = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resource.id,
          rating: userRating
        })
      });

      if (!ratingResponse.ok) {
        throw new Error("评分提交失败");
      }

      const ratingData = await ratingResponse.json();
      if (ratingData.code !== 0) {
        throw new Error(ratingData.message || '评分提交失败');
      }

      // 2. 再提交评论
      const commentResponse = await fetch(`/api/resources/${resource.uuid}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: comment.trim()
        })
      });

      if (!commentResponse.ok) {
        throw new Error("评论提交失败");
      }

      const commentData = await commentResponse.json();
      if (commentData.code !== 0) {
        throw new Error(commentData.message || '评论提交失败');
      }

      // 3. 成功后更新状态
      setHasRated(true);
      setComment("");
      toast.success("评价发布成功");

      // 只更新资源的评分统计，不重新获取整个资源信息
      if (resource) {
        setResource({
          ...resource,
          rating_avg: ratingData.data?.rating_avg || resource.rating_avg,
          rating_count: ratingData.data?.rating_count || resource.rating_count
        });
      }

      // 将新评价添加到评论列表（乐观更新）
      if (commentData.code === 0 && commentSectionRef.current && user) {
        const newComment = {
          id: commentData.data?.id || Date.now(),
          uuid: commentData.data?.uuid || `temp-${Date.now()}`,
          content: comment.trim(),
          author: {
            uuid: user?.uuid || '',
            nickname: user?.nickname || '',
            avatar_url: user?.avatar_url || ''
          },
          created_at: new Date().toISOString(),
          replies: [],
          reply_count: 0
        };

        commentSectionRef.current.addComment(newComment);
      }

    } catch (error) {
      console.error("评价发布失败:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("评价发布失败，请稍后再试");
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAccess = async () => {
    if (!resource?.file_url) return;

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

  const handleFavoriteToggle = (favorited: boolean) => {
    // 收藏状态已在FavoriteButton组件内部处理
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: resource?.title,
          text: resource?.description,
          url: window.location.href,
        });
      } else {
        // 复制链接到剪贴板
        await navigator.clipboard.writeText(window.location.href);
        // TODO: 显示成功提示
      }
    } catch (error) {
      console.error("分享失败:", error);
    }
  };

  if (loading) {
    return <ResourceDetailSkeleton />;
  }

  if (!resource) {
    return <div>资源不存在</div>;
  }

  // 移除文件类型图标

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* 左侧主要内容 */}
      <div className="lg:col-span-2 space-y-6 lg:space-y-8">
        {/* 资源头部信息 */}
        <Card className="p-6 lg:p-8">
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl lg:text-3xl font-bold mb-4">{resource.title}</h1>
                <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 mb-4 space-y-4 lg:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(resource.rating_avg)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-base lg:text-lg font-bold">{resource.rating_avg.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">{resource.rating_count} 评价</span>
                  </div>
                  <div className="hidden lg:block h-6 w-px bg-gray-300"></div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Eye className="w-5 h-5" />
                    <span className="font-medium">{resource.access_count} 次访问</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 lg:ml-8 mt-4 lg:mt-0">
                {resource.id && resource.uuid && (
                  <FavoriteButton
                    resourceUuid={resource.uuid}
                    onToggle={handleFavoriteToggle}
                    className="p-3 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all hover:scale-105"
                  />
                )}
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="p-3 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition-all hover:scale-105"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* 资源描述 */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-base lg:text-lg font-bold mb-3">资源介绍</h3>
            <p className="text-muted-foreground leading-relaxed text-sm lg:text-base">
              {resource.description}
            </p>
            {resource.content && (
              <div className="mt-3 text-muted-foreground leading-relaxed text-sm lg:text-base">
                {resource.content.split('\n').map((line, index) => (
                  <p key={index} className="mb-2">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* 标签 */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base lg:text-lg font-bold mb-3">相关标签</h3>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 访问按钮 */}
          <div className="text-center">
            <div className="relative inline-block">
              <Button
                onClick={handleAccess}
                disabled={isAccessing}
                className="px-8 lg:px-12 py-3 lg:py-4 text-base lg:text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Eye className="w-5 h-5 mr-2" />
                {isAccessing ? "访问中..." : "立即访问资源"}
              </Button>
              {/* 积分消耗小标签 */}
              {!resource.is_free && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg border-2 border-white transform rotate-12">
                  <Tag className="w-3 h-3 inline-block mr-1" />
                  {resource.credits}积分
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 用户评价部分 */}
        <Card className="p-6 lg:p-8">
          <h2 className="text-xl lg:text-2xl font-bold mb-6">用户评价</h2>

          {/* 写评价 */}
          {user && (
            <div className="border border-border rounded-xl p-4 lg:p-6 mb-6 lg:mb-8 bg-muted/30">
              <h3 className="font-semibold text-base lg:text-lg mb-4">写下您的评价</h3>
              <div className="flex items-center space-x-1 lg:space-x-2 mb-4">
                <span className="text-muted-foreground text-sm lg:text-base whitespace-nowrap">您的评分：</span>
                <div className="flex items-center space-x-0.5 lg:space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRatingChange(star)}
                      className={`text-lg lg:text-xl transition-colors ${
                        star <= userRating
                          ? "text-yellow-400"
                          : "text-gray-300 hover:text-yellow-400"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full h-20 lg:h-24 p-3 border border-border rounded-lg resize-none text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="分享您使用这个资源的体验和感受..."
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitComment}
                  disabled={isSubmittingComment || userRating === 0 || !comment.trim()}
                  className="px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base"
                >
                  {isSubmittingComment ? "发布中..." : "发布评价"}
                </Button>
              </div>
            </div>
          )}

          {/* 评价列表 - 使用真实评论组件 */}
          <CommentSection ref={commentSectionRef} resourceId={resourceUuid} />
        </Card>
      </div>

      {/* 右侧作者信息 */}
      <div className="space-y-6">
        <Card className="p-4 lg:p-6">
          <h3 className="text-base lg:text-lg font-bold mb-4 flex items-center">
            <User className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            上传者
          </h3>
          <div className="flex items-center space-x-3 lg:space-x-4 mb-4">
            <Avatar className="w-10 h-10 lg:w-12 lg:h-12">
              <AvatarImage src={resource.author?.avatar_url || "https://pub-7d345f4cf2334fce864509d66ec976f3.r2.dev/avatars/momo.jpg"} />
              <AvatarFallback>
                {resource.author?.nickname?.charAt(0) || "张"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-bold text-base lg:text-lg">{resource.author?.nickname || "张教授"}</h4>
              <p className="text-muted-foreground text-sm lg:text-base">文学系教授</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <div className="text-center p-2 lg:p-3 bg-muted/30 rounded-lg">
              <div className="text-lg lg:text-xl font-bold">
                {authorStats?.uploadedResourcesCount ?? '-'}
              </div>
              <div className="text-xs lg:text-sm text-muted-foreground">上传资源</div>
            </div>
            <div className="text-center p-2 lg:p-3 bg-muted/30 rounded-lg">
              <div className="text-lg lg:text-xl font-bold">
                {authorStats?.totalVisitors ?? '-'}
              </div>
              <div className="text-xs lg:text-sm text-muted-foreground">总访客数</div>
            </div>
          </div>
        </Card>

        {/* 资源信息 */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">资源信息</h3>
          <div className="space-y-3">
            {resource.category && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">分类</span>
                <Badge variant="outline">{resource.category.name}</Badge>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">积分</span>
              <span className="text-sm font-medium">
                {resource.is_free ? "免费" : `${resource.credits}积分`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">发布时间</span>
              <span className="text-sm">
                {formatDistanceToNow(new Date(resource.created_at!), {
                  addSuffix: true,
                  locale: zhCN
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">访问次数</span>
              <span className="text-sm">{resource.access_count}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// 资源详情页骨架屏组件
function ResourceDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* 左侧主要内容骨架 */}
      <div className="lg:col-span-2 space-y-6 lg:space-y-8">
        {/* 资源头部信息骨架 */}
        <Card className="p-6 lg:p-8">
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
              <div className="flex-1">
                {/* 标题骨架 */}
                <Skeleton className="h-8 lg:h-10 w-3/4 mb-4" />

                {/* 评分和访问次数骨架 */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 mb-4 space-y-4 lg:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Skeleton key={star} className="h-5 w-5 rounded-full" />
                      ))}
                    </div>
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="hidden lg:block h-6 w-px bg-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>

              {/* 操作按钮骨架 */}
              <div className="flex items-center space-x-3 lg:ml-8 mt-4 lg:mt-0">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </div>

            {/* 资源介绍骨架 */}
            <div className="bg-muted/30 rounded-xl p-4 lg:p-6 mb-6">
              <Skeleton className="h-5 w-20 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>

            {/* 标签骨架 */}
            <div className="mb-6">
              <Skeleton className="h-5 w-16 mb-3" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((tag) => (
                  <Skeleton key={tag} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>

            {/* 访问按钮骨架 */}
            <div className="flex justify-center">
              <Skeleton className="h-12 w-48 rounded-lg" />
            </div>
          </div>
        </Card>

        {/* 用户评价骨架 */}
        <Card className="p-6 lg:p-8">
          <Skeleton className="h-6 w-24 mb-6" />

          {/* 写评价区域骨架 */}
          <div className="border border-border rounded-xl p-4 lg:p-6 mb-6 lg:mb-8 bg-muted/30">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="flex items-center space-x-1 lg:space-x-2 mb-4">
              <Skeleton className="h-4 w-16" />
              <div className="flex items-center space-x-0.5 lg:space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Skeleton key={star} className="h-5 w-5 rounded-full" />
                ))}
              </div>
            </div>
            <Skeleton className="h-20 lg:h-24 w-full mb-4 rounded-lg" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          {/* 评价列表骨架 */}
          <div className="space-y-4 lg:space-y-6">
            {[1, 2, 3].map((comment) => (
              <Card key={comment} className="p-4 lg:p-6">
                <div className="flex items-start space-x-3 lg:space-x-4">
                  <Skeleton className="w-10 h-10 lg:w-12 lg:h-12 rounded-full" />
                  <div className="flex-1">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-4 w-16" />
                        <div className="flex items-center space-x-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Skeleton key={star} className="h-4 w-4 rounded-full" />
                          ))}
                        </div>
                      </div>
                      <Skeleton className="h-3 w-20 mt-1 lg:mt-0" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* 查看更多评价按钮骨架 */}
          <div className="text-center mt-6 lg:mt-8">
            <Skeleton className="h-10 w-32 mx-auto" />
          </div>
        </Card>
      </div>

      {/* 右侧信息栏骨架 */}
      <div className="lg:col-span-1 space-y-4 lg:space-y-6">
        {/* 上传者信息骨架 */}
        <Card className="p-4 lg:p-6">
          <div className="flex items-center mb-4">
            <Skeleton className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex items-center space-x-3 lg:space-x-4 mb-4">
            <Skeleton className="w-10 h-10 lg:w-12 lg:h-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-20 mb-1" />
              <Skeleton className="h-4 w-24 mb-1" />
              <div className="flex items-center mt-1">
                <div className="flex items-center space-x-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Skeleton key={star} className="h-3 w-3 rounded-full" />
                  ))}
                </div>
                <Skeleton className="h-3 w-12 ml-2" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <div className="text-center p-2 lg:p-3 bg-muted/30 rounded-lg">
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <div className="text-center p-2 lg:p-3 bg-muted/30 rounded-lg">
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          </div>
        </Card>

        {/* 资源信息骨架 */}
        <Card className="p-4 lg:p-6">
          <div className="flex items-center mb-4">
            <Skeleton className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
