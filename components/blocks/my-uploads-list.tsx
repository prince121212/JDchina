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
  Trash2,
  Search,
  FileText,
  ImageIcon,
  Music,
  Video,
  Code,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { ResourceWithDetails } from "@/types/resource";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

// 移除文件类型图标映射，统一使用文档图标

// 状态图标和颜色映射
const statusConfig = {
  pending: {
    icon: Clock,
    label: "待审核",
    variant: "secondary" as const,
    color: "text-yellow-600"
  },
  approved: {
    icon: CheckCircle,
    label: "已通过",
    variant: "default" as const,
    color: "text-green-600"
  },
  rejected: {
    icon: XCircle,
    label: "已拒绝",
    variant: "destructive" as const,
    color: "text-red-600"
  }
};

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

// 资源卡片组件
function ResourceCard({ resource, onDelete }: {
  resource: ResourceWithDetails;
  onDelete: (resource: ResourceWithDetails) => void;
}) {
  const FileIcon = FileText; // 统一使用文档图标
  const statusInfo = statusConfig[resource.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo.icon;

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
              
              {/* 状态标签 */}
              <Badge variant={statusInfo.variant} className="ml-2 flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
            
            {/* 统计信息 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {resource.access_count} 访问
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {resource.view_count} 浏览
              </div>
              {resource.rating_count > 0 && (
                <StarRating rating={resource.rating_avg} />
              )}
              <span>
                {formatDistanceToNow(new Date(resource.created_at!), { 
                  addSuffix: true, 
                  locale: zhCN 
                })}
              </span>
            </div>
            
            {/* 价格和分类 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {resource.is_free ? (
                  <Badge variant="secondary" className="text-xs">免费</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">{resource.credits}积分</Badge>
                )}
                {resource.category && (
                  <Badge variant="outline" className="text-xs">
                    {resource.category.name}
                  </Badge>
                )}
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <Link href={`/resources/${resource.uuid}`}>
                  <Button variant="outline" size="sm">
                    查看
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(resource)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyUploadsList() {
  const t = useTranslations();
  const [resources, setResources] = useState<ResourceWithDetails[]>([]);
  const [filteredResources, setFilteredResources] = useState<ResourceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchMyUploads();
  }, []);

  useEffect(() => {
    let filtered = resources;
    
    // 状态筛选
    if (statusFilter !== "all") {
      filtered = filtered.filter(resource => resource.status === statusFilter);
    }
    
    // 搜索筛选
    if (searchQuery.trim()) {
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredResources(filtered);
  }, [resources, searchQuery, statusFilter]);

  const fetchMyUploads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-uploads');
      if (response.ok) {
        const data = await response.json();
        if (data.code === 0 && data.data?.resources) {
          setResources(data.data.resources);
        } else {
          console.error("API返回错误:", data.message || "未知错误");
          setResources([]);
        }
      } else {
        console.error("API请求失败:", response.status, response.statusText);
        setResources([]);
      }
    } catch (error) {
      console.error("获取我的上传失败:", error);
      toast.error("获取上传列表失败");
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resource: ResourceWithDetails) => {
    if (!confirm("确定要删除这个资源吗？此操作不可恢复。")) {
      return;
    }
    
    try {
      // TODO: 实现删除API调用
      // await fetch(`/api/resources/${resource.uuid}`, { method: 'DELETE' });
      
      setResources(prev => prev.filter(r => r.uuid !== resource.uuid));
      toast.success("资源删除成功");
    } catch (error) {
      console.error("删除资源失败:", error);
      toast.error("删除失败，请稍后再试");
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
      {/* 筛选和搜索 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索我的上传..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待审核</SelectItem>
            <SelectItem value="approved">已通过</SelectItem>
            <SelectItem value="rejected">已拒绝</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{resources.length}</div>
            <div className="text-sm text-muted-foreground">总上传</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {resources.filter(r => r.status === 'approved').length}
            </div>
            <div className="text-sm text-muted-foreground">已通过</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {resources.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-sm text-muted-foreground">待审核</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {resources.reduce((sum, r) => sum + r.access_count, 0)}
            </div>
            <div className="text-sm text-muted-foreground">总访问</div>
          </CardContent>
        </Card>
      </div>

      {/* 资源列表 */}
      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "没有找到匹配的资源" 
                : "您还没有上传任何资源"}
            </div>
            {!searchQuery && statusFilter === "all" && (
              <Link href="/upload">
                <Button className="mt-4">
                  上传第一个资源
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.uuid}
              resource={resource}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
