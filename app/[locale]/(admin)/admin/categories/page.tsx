import { getUserUuid, getUserEmail } from "@/services/user";
import { redirect } from "next/navigation";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { TableColumn } from "@/types/blocks/table";
import { getAllCategories } from "@/models/category";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/dashboard/header";
import CategoryActions from "@/components/admin/category-actions";

export default async function AdminCategoriesPage() {
  const user_uuid = await getUserUuid();
  const user_email = await getUserEmail();

  const callbackUrl = `/admin/categories`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 检查管理员权限
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  const isAdmin = adminEmails.includes(user_email);

  if (!isAdmin) {
    redirect('/');
  }

  // 获取分类列表
  const categories = await getAllCategories(true, true);

  const crumb = {
    items: [
      { title: "管理后台", url: "/admin" },
      { title: "资源管理", url: "/admin/resources" },
      { title: "分类管理", is_active: true }
    ]
  };

  const columns: TableColumn[] = [
    { 
      name: "name", 
      title: "分类名称",
      callback: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.name}</span>
          {row.parent_id && (
            <Badge variant="outline" className="text-xs">子分类</Badge>
          )}
        </div>
      )
    },
    {
      name: "description",
      title: "描述",
      callback: (row) => (
        <span className="text-sm text-muted-foreground max-w-xs truncate">
          {row.description || "无描述"}
        </span>
      )
    },
    {
      name: "parent",
      title: "父分类",
      callback: (row) => (
        <span className="text-sm">
          {row.parent_name || "顶级分类"}
        </span>
      )
    },
    {
      name: "resource_count",
      title: "资源数量",
      callback: (row) => (
        <Badge variant="secondary" className="text-xs">
          {row.resource_count || 0} 个
        </Badge>
      )
    },
    {
      name: "sort_order",
      title: "排序",
      callback: (row) => (
        <span className="text-sm">{row.sort_order || 0}</span>
      )
    },
    {
      name: "created_at",
      title: "创建时间",
      callback: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.created_at ? moment(row.created_at).format("YYYY-MM-DD") : "未知"}
        </span>
      )
    },
    {
      name: "actions",
      title: "操作",
      callback: (row) => (
        <CategoryActions
          categoryId={row.id}
          categoryName={row.name}
        />
      )
    },
  ];

  const table: TableSlotType = {
    title: "分类管理",
    description: `共 ${categories.length} 个分类`,
    toolbar: {
      items: [
        {
          title: "添加分类",
          icon: "RiAddLine",
          url: "/admin/categories/add",
        },
        {
          title: "刷新",
          icon: "RiRefreshLine",
          url: "/admin/categories",
        },
      ],
    },
    columns,
    data: categories,
  };

  return (
    <>
      <Header crumb={crumb} />
      <div className="w-full px-4 md:px-8 py-8">
        <TableSlot {...table} />
      </div>
    </>
  );
}
