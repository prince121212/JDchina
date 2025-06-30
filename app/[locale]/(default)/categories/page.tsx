import { Suspense } from "react";
import CategoriesListWrapper from "@/components/blocks/categories-list-wrapper";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageMetadata, PAGE_TITLES, PAGE_DESCRIPTIONS } from "@/lib/metadata";

export default async function CategoriesPage() {

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">资源分类</h1>
          <p className="text-muted-foreground">
            浏览不同类别的资源，快速找到您需要的内容
          </p>
        </div>

        {/* 分类列表 */}
        <Suspense fallback={<CategoriesListSkeleton />}>
          <CategoriesListWrapper />
        </Suspense>
      </div>
    </div>
  );
}

function CategoriesListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export async function generateMetadata() {
  return createPageMetadata({
    title: PAGE_TITLES.CATEGORIES,
    description: PAGE_DESCRIPTIONS.CATEGORIES,
    keywords: "资源分类,分类浏览,设计素材,开发工具,文档模板",
    url: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://wm985.com'}/categories`,
    locale: 'zh_CN',
  });
}
