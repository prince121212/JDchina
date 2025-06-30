import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";
import MyFavoritesList from "@/components/blocks/my-favorites-list";
import { createPageMetadata, PAGE_TITLES, PAGE_DESCRIPTIONS } from "@/lib/metadata";

export default async function MyFavoritesPage() {
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email) {
    redirect("/auth/signin");
  }



  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">我的收藏</h3>
        <p className="text-sm text-muted-foreground">
          管理您收藏的资源，快速访问感兴趣的内容
        </p>
      </div>
      <div className="border-t pt-6">
        <MyFavoritesList />
      </div>
    </div>
  );
}

export async function generateMetadata() {
  return createPageMetadata({
    title: PAGE_TITLES.MY_FAVORITES,
    description: PAGE_DESCRIPTIONS.MY_FAVORITES,
    keywords: "我的收藏,收藏管理,收藏资源,个人收藏",
    url: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://wm985.com'}/my-favorites`,
    locale: 'zh_CN',
  });
}
