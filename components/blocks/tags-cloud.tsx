"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tag } from "@/types/resource";
import { log } from "@/lib/logger";

// 预定义的标签颜色
const tagColors = [
  "bg-blue-100 text-blue-800 hover:bg-blue-200",
  "bg-green-100 text-green-800 hover:bg-green-200",
  "bg-purple-100 text-purple-800 hover:bg-purple-200",
  "bg-orange-100 text-orange-800 hover:bg-orange-200",
  "bg-pink-100 text-pink-800 hover:bg-pink-200",
  "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  "bg-red-100 text-red-800 hover:bg-red-200",
  "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
];

// 根据使用次数计算标签大小
function getTagSize(usageCount: number, maxUsage: number): string {
  const ratio = usageCount / maxUsage;
  if (ratio > 0.8) return "text-2xl";
  if (ratio > 0.6) return "text-xl";
  if (ratio > 0.4) return "text-lg";
  if (ratio > 0.2) return "text-base";
  return "text-sm";
}

// 根据使用次数计算标签权重
function getTagWeight(usageCount: number, maxUsage: number): string {
  const ratio = usageCount / maxUsage;
  if (ratio > 0.6) return "font-bold";
  if (ratio > 0.3) return "font-semibold";
  return "font-normal";
}

interface TagItemProps {
  tag: Tag;
  maxUsage: number;
  colorIndex: number;
}

function TagItem({ tag, maxUsage, colorIndex }: TagItemProps) {
  const ratio = (tag.usage_count || 0) / Math.max(maxUsage, 1);

  // 根据使用频率确定样式类别
  let buttonClass = "";
  let sizeClass = "";

  if (ratio > 0.8) {
    // 超热门标签 - 渐变背景，大字体
    buttonClass = "bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-bold hover:shadow-lg transform hover:scale-105 transition-all";
    sizeClass = "px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-lg";
  } else if (ratio > 0.6) {
    // 超热门标签 - 渐变背景，大字体
    buttonClass = "bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-bold hover:shadow-lg transform hover:scale-105 transition-all";
    sizeClass = "px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-lg";
  } else if (ratio > 0.4) {
    // 热门标签 - 渐变背景，中等字体
    buttonClass = "bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all";
    sizeClass = "px-3 lg:px-5 py-2 lg:py-3 text-sm lg:text-base";
  } else if (ratio > 0.2) {
    // 中等热度标签 - 单色背景
    const colors = [
      "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800",
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800",
      "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800",
      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800",
      "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800"
    ];
    buttonClass = `${colors[colorIndex % colors.length]} rounded-full transition-all`;
    sizeClass = "px-3 py-2 text-sm";
  } else {
    // 一般标签 - 灰色背景
    buttonClass = "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all";
    sizeClass = "px-3 py-1 text-sm";
  }

  return (
    <Link href={`/resources?tags=${encodeURIComponent(tag.name)}`}>
      <button className={`${buttonClass} ${sizeClass}`}>
        {tag.name}
        <span className="text-xs opacity-80 ml-1">
          ({tag.usage_count || 0})
        </span>
      </button>
    </Link>
  );
}

export default function TagsCloud() {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // 确保组件在客户端正确挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchTags();
    }
  }, [mounted]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      log.info("开始获取标签云数据", {
        endpoint: "/api/tags",
        params: { type: "popular", limit: 50 }
      });

      const response = await fetch('/api/tags?type=popular&limit=50');

      if (response.ok) {
        const result = await response.json();
        if (result.code === 0 && result.data?.tags) {
          log.info("标签云数据获取成功", {
            tagsCount: result.data.tags.length,
            endpoint: "/api/tags"
          });
          setTags(result.data.tags);
        } else {
          log.error("标签云API返回错误", new Error(result.message || "未知错误"), {
            endpoint: "/api/tags",
            responseCode: result.code,
            message: result.message
          });
          setTags([]);
        }
      } else {
        log.error("标签云API请求失败", new Error(`HTTP ${response.status}`), {
          endpoint: "/api/tags",
          status: response.status,
          statusText: response.statusText
        });
        setTags([]);
      }
    } catch (error) {
      log.error("获取标签云数据失败", error as Error, {
        endpoint: "/api/tags",
        params: { type: "popular", limit: 50 }
      });
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  // 在服务端渲染时返回加载状态
  if (!mounted || loading) {
    return (
      <div className="flex flex-wrap gap-3 justify-center">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`h-8 bg-muted rounded-full animate-pulse ${
              i % 4 === 0 ? 'w-20' :
              i % 4 === 1 ? 'w-16' :
              i % 4 === 2 ? 'w-24' : 'w-12'
            }`}
          />
        ))}
      </div>
    );
  }

  const maxUsage = tags.length > 0 ? Math.max(...tags.map(tag => tag.usage_count || 0)) : 1;

  return (
    <div className="max-w-4xl mx-auto">
      {tags.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          暂无标签
        </div>
      ) : (
        <div className="flex flex-wrap justify-center items-center gap-3">
          {tags.map((tag, index) => (
            <TagItem
              key={tag.id}
              tag={tag}
              maxUsage={maxUsage}
              colorIndex={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
