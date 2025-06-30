import { getUserUuid, getUserEmail } from "@/services/user";
import { redirect } from "next/navigation";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType, TableColumn } from "@/types/slots/table";
import { getResourcesList } from "@/models/resource";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/dashboard/header";

export default async function AdminResourcesPage() {
  const user_uuid = await getUserUuid();
  const user_email = await getUserEmail();

  const callbackUrl = `/admin/resources`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 检查管理员权限
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  const isAdmin = adminEmails.includes(user_email);

  if (!isAdmin) {
    redirect('/');
  }

  // 获取资源列表
  const resources = await getResourcesList({
    limit: 50,
    offset: 0,
    sort: 'latest'
  });

  const crumb = {
    items: [
      { title: "管理后台", url: "/admin" },
      { title: "资源管理", url: "/admin/resources" },
      { title: "资源列表", is_active: true }
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
      name: "status",
      title: "状态",
      callback: (row) => {
        const statusConfig = {
          pending: { label: "待审核", variant: "secondary" as const },
          approved: { label: "已通过", variant: "default" as const },
          rejected: { label: "已拒绝", variant: "destructive" as const }
        };
        const config = statusConfig[row.status as keyof typeof statusConfig] || statusConfig.pending;
        return (
          <Badge variant={config.variant} className="text-xs">
            {config.label}
          </Badge>
        );
      }
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
      name: "stats",
      title: "统计",
      callback: (row) => (
        <div className="text-xs text-muted-foreground">
          <div>访问: {row.access_count}</div>
          <div>浏览: {row.view_count}</div>
          <div>评分: {row.rating_avg?.toFixed(1)} ({row.rating_count})</div>
        </div>
      )
    },
    {
      name: "created_at",
      title: "创建时间",
      callback: (row) => (
        <span className="text-xs text-muted-foreground">
          {moment(row.created_at).format("YYYY-MM-DD HH:mm")}
        </span>
      )
    },
  ];

  const table: TableSlotType = {
    title: "资源列表",
    description: "管理平台上的所有资源",
    toolbar: {
      items: [
        {
          title: "刷新",
          icon: "RiRefreshLine",
          url: "/admin/resources",
        },
        {
          title: "待审核",
          icon: "RiTimeLine",
          url: "/admin/resources/pending",
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
