import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";
import MyUploadsList from "@/components/blocks/my-uploads-list";
import { createPageMetadata, PAGE_TITLES, PAGE_DESCRIPTIONS } from "@/lib/metadata";

export default async function MyUploadsPage() {
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email) {
    redirect("/auth/signin");
  }



  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">我的上传</h3>
        <p className="text-sm text-muted-foreground">
          管理您上传的资源，查看审核状态和下载统计
        </p>
      </div>
      <div className="border-t pt-6">
        <MyUploadsList />
      </div>
    </div>
  );
}

export async function generateMetadata() {
  return createPageMetadata({
    title: PAGE_TITLES.MY_UPLOADS,
    description: PAGE_DESCRIPTIONS.MY_UPLOADS,
    keywords: "我的上传,上传管理,资源管理,上传历史",
    url: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://wm985.com'}/my-uploads`,
    locale: 'zh_CN',
  });
}
