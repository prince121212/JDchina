import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import ResourceList from "@/components/blocks/resource-list";
import ResourceFilter from "@/components/blocks/resource-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageMetadata, createSearchTitle, createCategoryTitle, createTagsTitle, PAGE_TITLES, PAGE_DESCRIPTIONS } from "@/lib/metadata";

// 复用现有的页面布局模式
export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    tags?: string;
    search?: string;
    sort?: string;
    page?: string;
    type?: string;
    free?: string;
  }>;
}) {
  const params = await searchParams;
  const t = await getTranslations();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">资源库</h1>
        <p className="text-muted-foreground">
          发现和访问各种类型的文明资源
        </p>
      </div>

      {/* 顶部筛选栏 - 按照原型图设计 */}
      <div className="card p-4 lg:p-6 mb-6 lg:mb-8">
        <Suspense fallback={<div>加载筛选器...</div>}>
          <ResourceFilter compact={true} />
        </Suspense>
      </div>

      {/* 资源列表 */}
      <div>
        <Suspense fallback={<ResourceListSkeleton />}>
          <ResourceList
            initialFilters={{
              category: params.category,
              tags: params.tags?.split(',').filter(Boolean),
              search: params.search,
              sort: params.sort as 'latest' | 'popular' | 'rating' | 'views',
              is_free: params.free === 'true' ? true : params.free === 'false' ? false : undefined
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

// 复用现有的 Skeleton 组件模式
function ResourceListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    tags?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;

  let title: string = PAGE_TITLES.RESOURCES;
  let description: string = PAGE_DESCRIPTIONS.RESOURCES;

  if (params.search) {
    title = createSearchTitle(params.search);
    description = `搜索"${params.search}"相关的优质资源，包括设计素材、开发工具、文档模板等。`;
  } else if (params.category) {
    title = createCategoryTitle(params.category);
    description = `浏览${params.category}分类下的所有优质资源，精选高质量内容，免费访问。`;
  } else if (params.tags) {
    const tagList = params.tags.split(',').filter(Boolean);
    title = createTagsTitle(tagList);
    description = `查看${tagList.slice(0, 3).join('、')}相关的优质资源，精心筛选的高质量内容。`;
  }

  return createPageMetadata({
    title,
    description,
    keywords: "资源库,资源访问,设计素材,开发工具,文档模板,音频素材,视频素材,免费资源,付费资源,文明",
    url: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://wm985.com'}/resources`,
    locale: 'zh_CN',
  });
}
