import { getUserUuid, getUserEmail } from "@/services/user";
import { redirect } from "next/navigation";
import Header from "@/components/dashboard/header";
import { getAllCategories, findCategoryById } from "@/models/category";
import CategoryForm from "@/components/admin/category-form";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
  const user_uuid = await getUserUuid();
  const user_email = await getUserEmail();

  const { id } = await params;
  const categoryId = parseInt(id);

  if (isNaN(categoryId)) {
    notFound();
  }

  const callbackUrl = `/admin/categories/${id}/edit`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 检查管理员权限
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  const isAdmin = adminEmails.includes(user_email);

  if (!isAdmin) {
    redirect('/');
  }

  // 获取分类信息和所有分类列表
  const [category, categories] = await Promise.all([
    findCategoryById(categoryId),
    getAllCategories()
  ]);

  if (!category) {
    notFound();
  }

  const crumb = {
    items: [
      { title: "管理后台", url: "/admin" },
      { title: "资源管理", url: "/admin/resources" },
      { title: "分类管理", url: "/admin/categories" },
      { title: "编辑分类", is_active: true }
    ]
  };

  return (
    <>
      <Header crumb={crumb} />
      <div className="w-full px-4 md:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">编辑分类</h1>
            <p className="text-muted-foreground">
              修改分类 "{category.name}" 的信息
            </p>
          </div>
          
          <CategoryForm 
            categories={categories}
            category={category}
            mode="edit"
          />
        </div>
      </div>
    </>
  );
}
