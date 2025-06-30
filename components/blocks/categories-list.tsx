"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Palette,
  Code,
  FileText,
  Music,
  Video,
  Image,
  Type,
  Package,
  BookOpen,
  Layout
} from "lucide-react";
import { CategoryWithChildren } from "@/types/resource";
import { buildCategoryTree } from "@/models/category";

// 分类图标映射 - 保持使用系统的Lucide图标
const categoryIcons = {
  "文学作品": FileText,
  "艺术设计": Palette,
  "音乐舞蹈": Music,
  "历史文化": Package,
  "戏曲表演": Video,
  "教育资料": BookOpen,
};

interface CategoryCardProps {
  category: CategoryWithChildren;
  isExpanded: boolean;
  onToggle: () => void;
}

function CategoryCard({ category, isExpanded, onToggle }: CategoryCardProps) {
  const IconComponent = categoryIcons[category.name as keyof typeof categoryIcons] || Folder;
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="card category-item">
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-4">
            <Link href={`/resources?category=${category.id}`}>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors" onClick={(e) => e.stopPropagation()}>
                <IconComponent className="h-6 w-6 text-primary" />
              </div>
            </Link>
            <div>
              <Link href={`/resources?category=${category.id}`}>
                <h3 className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                  {category.resource_count || 0} 个资源
                </p>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 查看资源按钮 - 参考原型图 */}
            <Link href={`/resources?category=${category.id}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="hidden sm:flex"
              >
                查看资源
              </Button>
            </Link>
            {hasChildren && (
              <svg className="w-5 h-5 text-muted-foreground transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            )}
          </div>
        </div>

        {/* 子分类 - 按照原型图设计 */}
        {hasChildren && isExpanded && (
          <div className="mt-4 subcategory-list rounded-lg bg-muted/30">
            <div className="p-4 space-y-3">
              {category.children!.map((child) => (
                <Link
                  key={child.id}
                  href={`/resources?category=${child.id}`}
                  className="flex items-center justify-between cursor-pointer hover:bg-accent rounded-lg p-2 transition-colors"
                >
                  <span className="text-sm font-medium">{child.name}</span>
                  <span className="text-sm text-muted-foreground">{child.resource_count || 0} 个资源</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CategoriesList() {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // 确保组件在客户端正确挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchCategories();
    }
  }, [mounted]);

  const fetchCategories = async () => {
    try {
      setLoading(true);

      // 调用真实API获取分类数据
      const response = await fetch('/api/categories?include_children=true&include_count=true');
      if (response.ok) {
        const data = await response.json();
        if (data.code === 0) {
          // 构建树形结构
          const categoriesWithChildren = buildCategoryTree(data.data.categories || []);
          setCategories(categoriesWithChildren);
          return;
        }
      }

      // 如果API调用失败，使用模拟数据作为后备
      console.warn('API调用失败，使用模拟数据');
      const mockCategories: CategoryWithChildren[] = [
        {
          id: 1,
          name: "文学作品",
          description: "古典诗词、现代文学、小说散文等文学作品",
          sort_order: 1,
          resource_count: 234,
          children: [
            { id: 11, name: "古典诗词", sort_order: 1, resource_count: 89 },
            { id: 12, name: "现代文学", sort_order: 2, resource_count: 67 },
            { id: 13, name: "古典小说", sort_order: 3, resource_count: 45 },
            { id: 14, name: "散文随笔", sort_order: 4, resource_count: 33 },
          ]
        },
        {
          id: 2,
          name: "艺术设计",
          description: "绘画、书法、设计作品等艺术创作",
          sort_order: 2,
          resource_count: 156,
          children: [
            { id: 21, name: "传统绘画", sort_order: 1, resource_count: 56 },
            { id: 22, name: "书法作品", sort_order: 2, resource_count: 43 },
            { id: 23, name: "现代设计", sort_order: 3, resource_count: 34 },
            { id: 24, name: "工艺美术", sort_order: 4, resource_count: 23 },
          ]
        },
        {
          id: 3,
          name: "音乐舞蹈",
          description: "传统音乐、民族舞蹈、戏曲表演等",
          sort_order: 3,
          resource_count: 142,
          children: [
            { id: 31, name: "民族音乐", sort_order: 1, resource_count: 52 },
            { id: 32, name: "传统舞蹈", sort_order: 2, resource_count: 38 },
            { id: 33, name: "器乐演奏", sort_order: 3, resource_count: 29 },
            { id: 34, name: "声乐作品", sort_order: 4, resource_count: 23 },
          ]
        },
        {
          id: 4,
          name: "历史文化",
          description: "历史文献、文化遗产、考古发现等",
          sort_order: 4,
          resource_count: 128,
          children: [
            { id: 41, name: "历史文献", sort_order: 1, resource_count: 45 },
            { id: 42, name: "文化遗产", sort_order: 2, resource_count: 38 },
            { id: 43, name: "考古资料", sort_order: 3, resource_count: 25 },
            { id: 44, name: "民俗文化", sort_order: 4, resource_count: 20 },
          ]
        },
        {
          id: 5,
          name: "戏曲表演",
          description: "京剧、昆曲、地方戏等传统戏曲",
          sort_order: 5,
          resource_count: 97,
          children: [
            { id: 51, name: "京剧", sort_order: 1, resource_count: 34 },
            { id: 52, name: "昆曲", sort_order: 2, resource_count: 28 },
            { id: 53, name: "地方戏", sort_order: 3, resource_count: 22 },
            { id: 54, name: "戏曲理论", sort_order: 4, resource_count: 13 },
          ]
        },
        {
          id: 6,
          name: "教育资料",
          description: "教学课件、学习资料、教育视频等",
          sort_order: 6,
          resource_count: 198,
          children: [
            { id: 61, name: "教学课件", sort_order: 1, resource_count: 78 },
            { id: 62, name: "学习资料", sort_order: 2, resource_count: 56 },
            { id: 63, name: "教育视频", sort_order: 3, resource_count: 34 },
            { id: 64, name: "参考文献", sort_order: 4, resource_count: 30 },
          ]
        },
      ];
      
      setCategories(mockCategories);
    } catch (error) {
      console.error("获取分类失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 在服务端渲染时返回加载状态
  if (!mounted || loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-muted rounded-lg animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 w-24 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full bg-muted rounded animate-pulse mb-2"></div>
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 如果没有分类数据，显示空状态
  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
          <Layout className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">暂无分类</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          系统中还没有创建任何资源分类，请稍后再来查看
        </p>
        <Button variant="outline" asChild>
          <Link href="/resources">
            浏览所有资源
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          isExpanded={expandedCategories.has(category.id!)}
          onToggle={() => toggleCategory(category.id!)}
        />
      ))}
    </div>
  );
}
