"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Image,
  Music,
  Video,
  Code,
  Database,
  Layout,
  BookOpen,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

// 分类图标映射 - 保持当前系统的Lucide图标
const categoryIcons = {
  "文学作品": BookOpen,
  "艺术设计": Image,
  "音乐舞蹈": Music,
  "历史文化": Layout,
  "戏曲表演": Video,
  "教育资料": FileText,
};

// 分类背景色映射 - 参考原型图的不同颜色
const categoryColors = {
  "文学作品": "bg-red-100 dark:bg-red-900",
  "艺术设计": "bg-blue-100 dark:bg-blue-900",
  "音乐舞蹈": "bg-green-100 dark:bg-green-900",
  "历史文化": "bg-yellow-100 dark:bg-yellow-900",
  "戏曲表演": "bg-purple-100 dark:bg-purple-900",
  "教育资料": "bg-indigo-100 dark:bg-indigo-900",
};

interface Category {
  id: number;
  name: string;
  description: string;
  resource_count?: number;
}

interface ResourceCategoriesProps {
  categories?: Category[];
  showAll?: boolean;
}

export default function ResourceCategories({
  categories: propCategories = [],
  showAll = false
}: ResourceCategoriesProps) {
  const t = useTranslations();
  const [categories, setCategories] = useState<Category[]>(propCategories);
  const [loading, setLoading] = useState(false);

  // 默认分类数据（仅在数据库为空时显示）
  const defaultCategories: Category[] = [
    { id: 1, name: "文学作品", description: "诗歌、小说、散文等文学创作", resource_count: 0 },
    { id: 2, name: "艺术设计", description: "绘画、雕塑、设计作品等", resource_count: 0 },
    { id: 3, name: "音乐舞蹈", description: "音乐作品、舞蹈表演等", resource_count: 0 },
    { id: 4, name: "历史文化", description: "历史文献、文化遗产等", resource_count: 0 },
    { id: 5, name: "戏曲表演", description: "传统戏曲、现代表演等", resource_count: 0 },
    { id: 6, name: "教育资料", description: "教学材料、学习资源等", resource_count: 0 },
  ];

  useEffect(() => {
    // 如果没有传入分类数据，则从API获取
    if (propCategories.length === 0) {
      fetchCategories();
    }
  }, [propCategories.length]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories?include_count=true');
      if (response.ok) {
        const data = await response.json();
        if (data.code === 0 && data.data.categories.length > 0) {
          setCategories(data.data.categories);
        } else {
          // 数据库为空时不显示任何分类
          setCategories([]);
        }
      } else {
        // API错误时也不显示分类
        setCategories([]);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
      // 网络错误时也不显示分类
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const displayCategories = categories;
  const visibleCategories = showAll ? displayCategories : displayCategories.slice(0, 6);

  // 如果没有分类数据，显示空状态
  if (!loading && categories.length === 0) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">浏览分类</h2>
              <p className="text-muted-foreground">
                探索各种类型的文明资源，找到您需要的内容
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/resources">
                查看更多 →
              </Link>
            </Button>
          </div>

          {/* 空状态 */}
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
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">浏览分类</h2>
              <p className="text-muted-foreground">
                探索各种类型的文明资源，找到您需要的内容
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/resources">
                查看更多 →
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 lg:p-6 text-center">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">浏览分类</h2>
            <p className="text-muted-foreground">
              探索各种类型的文明资源，找到您需要的内容
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/resources">
              查看更多 →
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6 mb-8">
          {visibleCategories.map((category) => {
            const IconComponent = categoryIcons[category.name as keyof typeof categoryIcons] || FileText;
            const bgColor = categoryColors[category.name as keyof typeof categoryColors] || "bg-gray-100 dark:bg-gray-900";

            return (
              <Link key={category.id} href={`/resources?category=${category.name}`}>
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer text-center">
                  <CardContent className="p-4 lg:p-6">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 ${bgColor} rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-5 h-5 lg:w-6 lg:h-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <h3 className="font-medium mb-1 text-sm lg:text-base group-hover:text-primary transition-colors">{category.name}</h3>
                    <p className="text-xs lg:text-sm text-muted-foreground">
                      {category.resource_count} 个资源
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {!showAll && displayCategories.length > 6 && (
          <div className="text-center">
            <Button variant="outline" asChild>
              <Link href="/categories">
                查看所有分类
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
