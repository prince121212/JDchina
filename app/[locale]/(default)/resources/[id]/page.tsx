import { Suspense } from "react";
import { notFound } from "next/navigation";
import ResourceDetail from "@/components/blocks/resource-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageMetadata } from "@/lib/metadata";

interface ResourcePageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function ResourcePage({ params }: ResourcePageProps) {
  const { id } = await params;


  // 这里应该从API获取资源详情
  // const resource = await getResourceByUuid(id);
  // if (!resource) {
  //   notFound();
  // }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 移除侧边栏，只保留主要内容 */}
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={<ResourceDetailSkeleton />}>
          <ResourceDetail resourceUuid={id} />
        </Suspense>
      </div>
    </div>
  );
}

function ResourceDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-32 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
      <Skeleton className="h-12 w-32" />
    </div>
  );
}

// 移除相关资源骨架屏组件

export async function generateMetadata({ params }: ResourcePageProps) {
  const { id } = await params;

  // TODO: 在实际应用中，这里应该根据资源ID获取真实的资源信息
  // const resource = await getResourceByUuid(id);

  // 模拟资源信息
  const resourceTitle = "资源详情";
  const resourceDescription = "查看资源的详细信息，包括文件类型、大小、作者、评分等。高质量资源，安全下载。";

  return createPageMetadata({
    title: resourceTitle,
    description: resourceDescription,
    keywords: "资源详情,文件下载,资源信息,设计素材,开发工具,文档模板",
    url: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://wm985.top'}/resources/${id}`,
    locale: 'zh_CN',
    type: 'article',
  });
}
