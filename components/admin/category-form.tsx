"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Category } from "@/types/resource";

interface CategoryFormProps {
  categories: Category[];
  category?: Category;
  mode: 'create' | 'edit';
}

export default function CategoryForm({ categories, category, mode }: CategoryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    parent_id: category?.parent_id?.toString() || '',
    icon: category?.icon || '',
    sort_order: category?.sort_order?.toString() || '0'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("分类名称不能为空");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : undefined,
        icon: formData.icon.trim() || undefined,
        sort_order: parseInt(formData.sort_order) || 0
      };

      const url = mode === 'create' 
        ? '/api/admin/categories'
        : `/api/admin/categories/${category?.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success(mode === 'create' ? "分类创建成功" : "分类更新成功");
        router.push('/admin/categories');
        router.refresh();
      } else {
        throw new Error(result.message || '操作失败');
      }

    } catch (error) {
      console.error("分类操作失败:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("操作失败，请稍后再试");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 过滤掉当前分类及其子分类（编辑模式下避免循环引用）
  const availableParentCategories = categories.filter(cat => {
    if (mode === 'edit' && category) {
      return cat.id !== category.id && cat.parent_id !== category.id;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? '创建分类' : '编辑分类'}
        </CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? '填写分类信息创建新的资源分类' 
            : '修改分类信息'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">分类名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="请输入分类名称"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">分类描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="请输入分类描述（可选）"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_id">父分类</Label>
            <Select
              value={formData.parent_id || "none"}
              onValueChange={(value) => handleInputChange('parent_id', value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择父分类（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无父分类（顶级分类）</SelectItem>
                {availableParentCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id!.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">图标</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => handleInputChange('icon', e.target.value)}
                placeholder="图标名称（可选）"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">排序</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => handleInputChange('sort_order', e.target.value)}
                placeholder="排序值"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? "处理中..." : (mode === 'create' ? "创建分类" : "更新分类")}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => router.push('/admin/categories')}
              disabled={isSubmitting}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
