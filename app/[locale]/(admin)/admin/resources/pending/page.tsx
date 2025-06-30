import { getUserUuid, getUserEmail } from "@/services/user";
import { redirect } from "next/navigation";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType, TableColumn } from "@/types/slots/table";
import { getResourcesList } from "@/models/resource";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Header from "@/components/dashboard/header";
import Link from "next/link";
import PendingResourceActions from "@/components/admin/pending-resource-actions";

export default async function AdminPendingResourcesPage() {
  const user_uuid = await getUserUuid();
  const user_email = await getUserEmail();

  const callbackUrl = `/admin/resources/pending`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 检查管理员权限
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  const isAdmin = adminEmails.includes(user_email);

  if (!isAdmin) {
    redirect('/');
  }

  // 获取待审核资源列表
  const resources = await getResourcesList({
    status: 'pending',
    limit: 50,
    offset: 0,
    sort: 'latest'
  });

  const crumb = {
    items: [
      { title: "管理后台", url: "/admin" },
      { title: "资源管理", url: "/admin/resources" },
      { title: "待审核资源", is_active: true }
    ]
  };

  const columns: TableColumn[] = [
    { 
      name: "title", 
      title: "资源标题",
      callback: (row) => (
        <div className="max-w-xs">
          <p className="font-medium truncate">{row.title}</p>
          <p className="text-xs text-muted-foreground truncate">{row.description}</p>
        </div>
      )
    },
    {
      name: "author",
      title: "作者",
      callback: (row) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={row.author?.avatar_url} />
            <AvatarFallback className="text-xs">
              {row.author?.nickname?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.author?.nickname || "匿名用户"}</span>
        </div>
      )
    },
    {
      name: "category",
      title: "分类",
      callback: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.category?.name || "未分类"}
        </Badge>
      )
    },

    {
      name: "is_free",
      title: "积分",
      callback: (row) => (
        <span className="text-sm">
          {row.is_free ? "免费" : `${row.credits || 0} 积分`}
        </span>
      )
    },
    {
      name: "created_at",
      title: "提交时间",
      callback: (row) => (
        <span className="text-xs text-muted-foreground">
          {moment(row.created_at).format("YYYY-MM-DD HH:mm")}
        </span>
      )
    },
    {
      name: "actions",
      title: "操作",
      callback: (row) => (
        <div className="flex items-center gap-2">
          <Link href={`/resources/${row.uuid}`} target="_blank">
            <Button variant="outline" size="sm">
              预览
            </Button>
          </Link>
          <PendingResourceActions
            resourceUuid={row.uuid}
            resourceTitle={row.title}
          />
        </div>
      )
    },
  ];

  const table: TableSlotType = {
    title: "待审核资源",
    description: `共 ${resources.length} 个资源等待审核`,
    toolbar: {
      items: [
        {
          title: "刷新",
          icon: "RiRefreshLine",
          url: "/admin/resources/pending",
        },
        {
          title: "所有资源",
          icon: "RiFileList3Line",
          url: "/admin/resources",
        },
      ],
    },
    columns,
    data: resources,
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
