"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ResourceCard from "./resource-card";
import { ResourceWithDetails } from "@/types/resource";

// 使用统一的Resource类型
type Resource = ResourceWithDetails;

interface PopularResourcesProps {
  resources?: Resource[];
  title?: string;
  description?: string;
}

export default function PopularResources({
  resources: propResources,
  title = "热门资源",
  description = "发现最受欢迎和高质量的文明资源"
}: PopularResourcesProps) {
  const t = useTranslations();
  const [resources, setResources] = useState<Resource[]>(propResources || []);
  const [loading, setLoading] = useState(!propResources);

  useEffect(() => {
    if (!propResources) {
      fetchPopularResources();
    }
  }, [propResources]);

  const fetchPopularResources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/resources/popular?limit=6');
      const data = await response.json();

      if (data.code === 0 && data.data?.resources) {
        setResources(data.data.resources);
      }
    } catch (error) {
      console.error('获取热门资源失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">{title}</h2>
            <p className="text-muted-foreground">
              {description}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/resources">
              查看更多 →
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 lg:p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.uuid}
                resource={resource}
                variant="default"
                showAuthor={true}
                showActions={true}
              />
            ))}
          </div>
        )}

        <div className="text-center">
          <Button variant="outline" size="lg" asChild>
            <Link href="/resources">
              查看更多资源
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
