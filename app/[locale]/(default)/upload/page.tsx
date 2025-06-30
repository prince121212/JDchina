import { Suspense } from "react";
import ResourceUploadForm from "@/components/blocks/resource-upload-form";
import { createPageMetadata, PAGE_TITLES, PAGE_DESCRIPTIONS } from "@/lib/metadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function UploadPage() {

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">上传资源</h1>
          <p className="text-muted-foreground">
            分享您的优质资源，帮助更多人获得价值
          </p>
        </div>

        {/* 上传须知 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>上传须知</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• 请确保分享的资源具有原创性或合法使用权</p>
              <p>• 请提供有效的资源链接，确保链接可以正常访问</p>
              <p>• 请填写准确的资源描述和标签，便于其他用户搜索和使用</p>
              <p>• 提交的资源将经过审核，审核通过后才会公开显示</p>
              <p>• 违反法律法规或平台规定的资源将被删除，严重者将被封号</p>
            </div>
          </CardContent>
        </Card>

        {/* 上传表单 */}
        <Suspense fallback={<UploadFormSkeleton />}>
          <ResourceUploadForm />
        </Suspense>
      </div>
    </div>
  );
}

function UploadFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-10 w-24" />
      </CardContent>
    </Card>
  );
}

export async function generateMetadata() {
  return createPageMetadata({
    title: PAGE_TITLES.UPLOAD,
    description: PAGE_DESCRIPTIONS.UPLOAD,
    keywords: "资源上传,文件分享,资源分享,文明资源",
    url: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://wm985.com'}/upload`,
    locale: 'zh_CN',
  });
}
