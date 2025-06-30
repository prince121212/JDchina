import { redirect } from "next/navigation";
import { getUserEmail, getUserUuid } from "@/services/user";
import { EmailSendFormWrapper } from "@/components/email/send-form-wrapper";
import Header from "@/components/dashboard/header";
import { log } from "@/lib/logger";

export default async function AdminEmailPage() {
  try {
    const user_uuid = await getUserUuid();
    const user_email = await getUserEmail();

    log.debug("Admin Email Page 访问", { user_uuid, user_email });

    const callbackUrl = `/admin/email`;
    if (!user_uuid) {
      log.debug("Admin Email Page - 用户未登录，重定向到登录页");
      redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    // 检查管理员权限
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
    const isAdmin = adminEmails.includes(user_email);

    if (!isAdmin) {
      log.security("Admin Email Page - 非管理员用户尝试访问", { user_email });
      redirect('/');
    }
  } catch (error) {
    log.error("Admin Email Page 初始化错误", error as Error);
    redirect('/');
  }

  const crumb = {
    items: [
      { title: "Admin", url: "/admin" },
      { title: "邮件服务管理", is_active: true }
    ]
  };

  return (
    <>
      <Header crumb={crumb} />
      <div className="w-full px-4 md:px-8 py-8">
        <h1 className="text-2xl font-medium mb-8">邮件服务管理</h1>
        <p className="text-sm text-muted-foreground mb-8">
          管理和测试邮件发送功能
        </p>

        <div className="grid gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">发送邮件</h2>
            <EmailSendFormWrapper />
          </div>

          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">邮件服务状态</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">SMTP配置:</span>
                <span className="ml-2">
                  {process.env.SMTP_PASS ? '✅ 已配置' : '❌ 未配置'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">配置说明</h3>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium">SMTP配置</h4>
                <p className="text-muted-foreground">
                  需要配置 SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASS 环境变量。
                  推荐使用腾讯企业邮箱作为SMTP服务。
                </p>
              </div>
              <div>
                <h4 className="font-medium">测试命令</h4>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  node scripts/test-email.js
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
