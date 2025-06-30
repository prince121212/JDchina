import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";
import ProfileTabs from "@/components/blocks/profile-tabs";
import { createPageMetadata, PAGE_TITLES, PAGE_DESCRIPTIONS } from "@/lib/metadata";

export default async function UserCenterPage() {
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email || !userInfo.uuid) {
    redirect("/auth/signin");
  }



  return (
    <div className="min-h-screen bg-background">
      <ProfileTabs user={{
        uuid: userInfo.uuid,
        nickname: userInfo.nickname,
        email: userInfo.email,
        avatar_url: userInfo.avatar_url
      }} />
    </div>
  );
}

export async function generateMetadata() {
  return createPageMetadata({
    title: PAGE_TITLES.USER_CENTER,
    description: PAGE_DESCRIPTIONS.USER_CENTER,
    keywords: "用户中心,个人资料,我的上传,我的收藏,积分管理",
    url: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://wm985.com'}/user-center`,
    locale: 'zh_CN',
  });
}
