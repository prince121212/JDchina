import { getUserUuid, getUserEmail } from "@/services/user";
import { redirect } from "next/navigation";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType, TableColumn } from "@/types/slots/table";
import { getAllTags } from "@/models/tag";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/dashboard/header";
import TagActions from "@/components/admin/tag-actions";

export default async function AdminTagsPage() {
  const user_uuid = await getUserUuid();
  const user_email = await getUserEmail();

  const callbackUrl = `/admin/tags`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 检查管理员权限
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  const isAdmin = adminEmails.includes(user_email);

  if (!isAdmin) {
    redirect('/');
  }

  // 获取标签列表
  const tags = await getAllTags();

  const crumb = {
    items: [
      { title: "管理后台", url: "/admin" },
      { title: "资源管理", url: "/admin/resources" },
      { title: "标签管理", is_active: true }
    ]
  };

  const columns: TableColumn[] = [
    { 
      name: "name", 
      title: "标签名称",
      callback: (row) => (
        <div className="flex items-center gap-2">
          {row.color && (
            <div 
              className="w-3 h-3 rounded-full border"
              style={{ backgroundColor: row.color }}
            />
          )}
          <span className="font-medium">{row.name}</span>
        </div>
      )
    },
    {
      name: "usage_count",
      title: "使用次数",
      callback: (row) => (
        <Badge variant="secondary" className="text-xs">
          {row.usage_count || 0} 次
        </Badge>
      )
    },
    {
      name: "color",
      title: "颜色",
      callback: (row) => (
        <span className="text-sm font-mono">
          {row.color || "未设置"}
        </span>
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
        <TagActions
          tagId={row.id}
          tagName={row.name}
        />
      )
    },
  ];

  const table: TableSlotType = {
    title: "标签管理",
    description: `共 ${tags.length} 个标签`,
    toolbar: {
      items: [
        {
          title: "添加标签",
          icon: "RiAddLine",
          url: "/admin/tags/add",
        },
        {
          title: "刷新",
          icon: "RiRefreshLine",
          url: "/admin/tags",
        },
      ],
    },
    columns,
    data: tags,
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
