import { getUserUuid, getUserEmail } from "@/services/user";
import { redirect } from "next/navigation";
import Header from "@/components/dashboard/header";
import { getAllCategories } from "@/models/category";
import CategoryForm from "@/components/admin/category-form";

export default async function AddCategoryPage() {
  const user_uuid = await getUserUuid();
  const user_email = await getUserEmail();

  const callbackUrl = `/admin/categories/add`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 检查管理员权限
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  const isAdmin = adminEmails.includes(user_email);

  if (!isAdmin) {
    redirect('/');
  }

  // 获取所有分类用于父分类选择
  const categories = await getAllCategories();

  const crumb = {
    items: [
      { title: "管理后台", url: "/admin" },
      { title: "资源管理", url: "/admin/resources" },
      { title: "分类管理", url: "/admin/categories" },
      { title: "添加分类", is_active: true }
    ]
  };

  return (
    <>
      <Header crumb={crumb} />
      <div className="w-full px-4 md:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">添加分类</h1>
            <p className="text-muted-foreground">
              创建新的资源分类
            </p>
          </div>
          
          <CategoryForm 
            categories={categories}
            mode="create"
          />
        </div>
      </div>
    </>
  );
}
