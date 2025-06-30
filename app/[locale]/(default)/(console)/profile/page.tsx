import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ProfileForm from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email) {
    redirect("/auth/signin");
  }

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("profile.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("profile.description")}</p>
      </div>
      <div className="border-t pt-6">
        <ProfileForm user={userInfo} />
      </div>
    </div>
  );
}
