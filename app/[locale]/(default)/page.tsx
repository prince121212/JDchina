
import { redirect } from 'next/navigation';

export default async function DefaultHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 重定向到资源页面，因为主页现在是简洁版本
  redirect(`/${locale}/resources`);
}
