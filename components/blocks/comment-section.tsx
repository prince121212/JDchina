"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Reply,
  Flag,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";

interface Comment {
  id: number;
  uuid: string;
  content: string;
  author: {
    uuid: string;
    nickname?: string;
    avatar_url?: string;
  };
  created_at: string;
  replies?: Comment[];
  reply_count?: number;
}

interface CommentSectionProps {
  resourceId: string;
  allowComments?: boolean;
  onCommentAdded?: (comment: Comment) => void;
}

export interface CommentSectionRef {
  addComment: (comment: Comment) => void;
}

const CommentSection = forwardRef<CommentSectionRef, CommentSectionProps>(({
  resourceId,
  allowComments = true,
  onCommentAdded
}, ref) => {
  const t = useTranslations();
  const { user } = useAppContext();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    addComment: (comment: Comment) => {
      setComments(prevComments => [comment, ...prevComments]);
      if (onCommentAdded) {
        onCommentAdded(comment);
      }
    }
  }));

  useEffect(() => {
    fetchComments();
  }, [resourceId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/resources/${resourceId}/comments`);
      const data = await response.json();

      if (data.code === 0) {
        setComments(data.data.comments || []);
      } else {
        throw new Error(data.message || '获取评论失败');
      }
    } catch (error) {
      console.error('获取评论失败:', error);
      toast.error('获取评论失败');
      // 设置空数组作为后备
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("请先登录");
      return;
    }

    if (!newComment.trim()) {
      toast.error("请输入评论内容");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/resources/${resourceId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() })
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success("评论发布成功");

        // 创建新评论对象并添加到列表顶部
        const newCommentObj: Comment = {
          id: result.data?.id || Date.now(),
          uuid: result.data?.uuid || `temp-${Date.now()}`,
          content: newComment.trim(),
          author: {
            uuid: user?.uuid || '',
            nickname: user?.nickname || '',
            avatar_url: user?.avatar_url || ''
          },
          created_at: new Date().toISOString(),
          replies: [],
          reply_count: 0
        };

        // 将新评论添加到列表顶部
        setComments(prevComments => [newCommentObj, ...prevComments]);
        setNewComment("");
      } else {
        throw new Error(result.message || '发布评论失败');
      }
    } catch (error) {
      console.error('发布评论失败:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('发布评论失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleReportComment = async (comment: Comment) => {
    if (!user) {
      toast.error("请先登录");
      return;
    }

    try {
      // 将举报视同反馈，调用反馈接口
      const reportContent = `用户举报评论：
评论内容: ${comment.content}
评论作者: ${comment.author?.nickname || '未知用户'}
资源链接: ${window.location.origin}/resources/${resourceId}`;

      const response = await fetch('/api/add-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: reportContent,
          rating: 0 // 举报默认评分为0
        }),
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success("举报已提交，感谢您的反馈");
      } else {
        throw new Error(result.message || '举报提交失败');
      }
    } catch (error) {
      console.error('举报失败:', error);
      toast.error('举报失败，请稍后再试');
    }
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!user?.isAdmin) {
      toast.error("无权限删除评论");
      return;
    }

    if (!confirm(`确定要删除这条评论吗？\n\n"${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/comments/${comment.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success("评论删除成功");
        // 从评论列表中移除已删除的评论
        setComments(prevComments =>
          prevComments.filter(c => c.id !== comment.id)
        );
      } else {
        throw new Error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      toast.error('删除评论失败，请稍后再试');
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'}`}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatar_url} />
          <AvatarFallback>
            {comment.author.nickname?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {comment.author.nickname || "匿名用户"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </span>
          </div>
          
          <p className="text-sm text-foreground mb-2">
            {comment.content}
          </p>
          
          <div className="flex items-center gap-4">
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="h-6 px-2 text-xs"
              >
                <Reply className="h-3 w-3 mr-1" />
                回复
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleReportComment(comment)}>
                  <Flag className="h-4 w-4 mr-2" />
                  举报
                </DropdownMenuItem>
                {user?.isAdmin && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteComment(comment)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* 回复输入框 */}
          {replyTo === comment.id && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="写下你的回复..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => {
                  if (!replyContent.trim()) {
                    toast.error("请输入回复内容");
                    return;
                  }

                  try {
                    const response = await fetch(`/api/resources/${resourceId}/comments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        content: replyContent.trim(),
                        parent_id: comment.id
                      })
                    });

                    const result = await response.json();

                    if (result.code === 0) {
                      toast.success("回复发布成功");

                      // 创建新回复对象
                      const newReply: Comment = {
                        id: result.data?.id || Date.now(),
                        uuid: result.data?.uuid || `temp-${Date.now()}`,
                        content: replyContent.trim(),
                        author: {
                          uuid: user?.uuid || '',
                          nickname: user?.nickname || '',
                          avatar_url: user?.avatar_url || ''
                        },
                        created_at: new Date().toISOString()
                      };

                      // 更新评论列表，将回复添加到对应评论的回复列表中
                      setComments(prevComments =>
                        prevComments.map(c =>
                          c.id === comment.id
                            ? {
                                ...c,
                                replies: [...(c.replies || []), newReply],
                                reply_count: (c.reply_count || 0) + 1
                              }
                            : c
                        )
                      );

                      setReplyTo(null);
                      setReplyContent("");
                    } else {
                      throw new Error(result.message || '回复发布失败');
                    }
                  } catch (error) {
                    console.error('回复发布失败:', error);
                    if (error instanceof Error) {
                      toast.error(error.message);
                    } else {
                      toast.error('回复发布失败');
                    }
                  }
                }}>
                  发布回复
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setReplyTo(null);
                    setReplyContent("");
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          )}
          
          {/* 回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            评论
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          评论 ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 发表评论 */}
        {allowComments && (
          <div className="space-y-3">
            <Textarea
              placeholder={user ? "写下你的评论..." : "请先登录后发表评论"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!user || isSubmitting}
              className="min-h-[80px]"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmitComment}
                disabled={!user || !newComment.trim() || isSubmitting}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "发布中..." : "发布评论"}
              </Button>
            </div>
          </div>
        )}

        {/* 评论列表 */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无评论，来发表第一条评论吧！
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CommentSection.displayName = 'CommentSection';

export default CommentSection;
