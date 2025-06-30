"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  X,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { ResourceUploadForm as ResourceUploadFormType } from "@/types/resource";



export default function ResourceUploadForm() {
  const t = useTranslations();
  const router = useRouter();

  const [formData, setFormData] = useState<ResourceUploadFormType>({
    title: "",
    description: "",
    content: "",
    category_id: 0,
    tags: [],
    is_free: true,
    credits: undefined,
  });

  const [resourceUrl, setResourceUrl] = useState("");
  const [categories, setCategories] = useState<Array<{id: number; name: string}>>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();

      if (data.code === 0 && data.data?.categories) {
        setCategories(data.data.categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name
        })));
      } else {
        throw new Error(data.message || '获取分类失败');
      }
    } catch (error) {
      console.error("获取分类失败:", error);
      toast.error("获取分类失败");

      // 使用文明知识库分类作为后备
      setCategories([
        { id: 1, name: "文学作品" },
        { id: 2, name: "艺术设计" },
        { id: 3, name: "音乐舞蹈" },
        { id: 4, name: "历史文化" },
        { id: 5, name: "戏曲表演" },
        { id: 6, name: "教育资料" },
      ]);
    }
  };



  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    
    if (formData.tags.includes(tag)) {
      toast.error("标签已存在");
      return;
    }
    
    if (formData.tags.length >= 10) {
      toast.error("最多只能添加10个标签");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tag]
    }));
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // 表单验证
    if (!formData.title.trim()) {
      toast.error("请输入资源标题");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("请输入资源描述");
      return;
    }

    if (!formData.category_id) {
      toast.error("请选择资源分类");
      return;
    }

    if (!resourceUrl.trim()) {
      toast.error("请输入资源链接");
      return;
    }

    // 验证URL格式
    try {
      new URL(resourceUrl);
    } catch {
      toast.error("请输入有效的资源链接");
      return;
    }

    try {
      setIsSubmitting(true);

      // 创建提交数据
      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        content: formData.content?.trim() || '',
        category_id: formData.category_id,
        tags: formData.tags,
        file_url: resourceUrl.trim(),

        is_free: formData.is_free,
        credits: formData.credits || 0,
      };

      // 提交资源信息
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success("资源提交成功！审核通过后将公开显示");

        // 重置表单
        setFormData({
          title: "",
          description: "",
          content: "",
          category_id: 0,
          tags: [],
          is_free: true,
          credits: undefined,
        });
        setResourceUrl("");
        setTagInput("");

        // 跳转到资源库页面
        router.push('/resources');
      } else {
        throw new Error(result.message || '提交失败');
      }

    } catch (error) {
      console.error("上传失败:", error);

      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("提交失败，请稍后再试");
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <Card>
      <CardHeader>
        <CardTitle>资源信息</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 资源标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">资源标题 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="请输入资源标题"
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          {/* 资源描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">资源描述 *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="请简要描述资源内容和用途"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>

          {/* 分类和标签 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">资源分类 *</Label>
              <Select
                value={formData.category_id.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: parseInt(value) }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">资源标签</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签后按回车添加"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddTag}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                        disabled={isSubmitting}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 资源链接 */}
          <div className="space-y-2">
            <Label htmlFor="resource-url">资源链接 *</Label>
            <Input
              id="resource-url"
              type="url"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://example.com/resource"
              disabled={isSubmitting}
            />
          </div>

          {/* 详细内容 */}
          <div className="space-y-2">
            <Label htmlFor="content">详细内容</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="可选：详细介绍资源的使用方法、特点等"
              rows={5}
              maxLength={2000}
              disabled={isSubmitting}
            />
          </div>



          {/* 资源定价 */}
          <div className="space-y-2">
            <Label htmlFor="credits">资源定价</Label>
            <div className="flex items-center space-x-3">
              <Select
                value={formData.credits?.toString() || "0"}
                onValueChange={(value) => {
                  const credits = parseInt(value);
                  setFormData(prev => ({
                    ...prev,
                    credits: credits,
                    is_free: credits === 0
                  }));
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 积分 (免费)</SelectItem>
                  <SelectItem value="1">1 积分</SelectItem>
                  <SelectItem value="2">2 积分</SelectItem>
                  <SelectItem value="3">3 积分</SelectItem>
                  <SelectItem value="5">5 积分</SelectItem>
                  <SelectItem value="10">10 积分</SelectItem>
                  <SelectItem value="30">30 积分</SelectItem>
                  <SelectItem value="50">50 积分</SelectItem>
                  <SelectItem value="100">100 积分</SelectItem>
                  <SelectItem value="500">500 积分</SelectItem>
                </SelectContent>
              </Select>

              {/* 价格预览标签 */}
              <div className={`flex items-center px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                formData.is_free
                  ? "bg-gradient-to-r from-green-500 to-blue-500 text-white"
                  : "bg-gradient-to-r from-orange-500 to-red-500 text-white"
              }`}>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  {formData.is_free ? (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  ) : (
                    <path d="M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M21.41,11.58L12.41,2.58C12.05,2.22 11.55,2 11,2H4C2.89,2 2,2.89 2,4V11C2,11.55 2.22,12.05 2.59,12.41L11.58,21.41C11.95,21.77 12.45,22 13,22C13.55,22 14.05,21.77 14.41,21.41L21.41,14.41C21.77,14.05 22,13.55 22,13C22,12.45 21.77,11.95 21.41,11.58Z"/>
                  )}
                </svg>
                {formData.is_free ? "免费" : `${formData.credits}积分`}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              设置用户访问此资源需要消耗的积分数量，0积分表示免费资源
            </p>
          </div>



          {/* 提交按钮 */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? "提交中..." : "提交资源"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
