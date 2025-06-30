import { getUserUuid, getUserEmail } from "@/services/user";
import { redirect } from "next/navigation";
import Header from "@/components/dashboard/header";
import SystemManagement from "@/components/admin/system-management";

export default async function AdminSystemPage() {
  const user_uuid = await getUserUuid();
  const user_email = await getUserEmail();

  const callbackUrl = `/admin/system`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 检查管理员权限
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  const isAdmin = adminEmails.includes(user_email);

  if (!isAdmin) {
    redirect('/');
  }

  const crumb = {
    items: [
      { title: "管理后台", url: "/admin" },
      { title: "系统管理", is_active: true }
    ]
  };

  return (
    <>
      <Header crumb={crumb} />
      <div className="w-full px-4 md:px-8 py-8">
        <h1 className="text-2xl font-medium mb-8">系统管理</h1>
        <p className="text-sm text-muted-foreground mb-8">
          管理系统数据和执行维护操作
        </p>
        <SystemManagement />
      </div>
    </>
  );
}
