import DashboardLayout from "@/components/dashboard/layout";
import Empty from "@/components/blocks/empty";
import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email) {
    redirect("/auth/signin");
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",");
  if (!adminEmails?.includes(userInfo?.email)) {
    return <Empty message="No access" />;
  }

  const sidebar: Sidebar = {
    brand: {
      title: "文明知识库",
      logo: {
        src: "/logo.png",
        alt: "文明知识库",
      },
      url: "/admin",
    },
    nav: {
      items: [
        {
          title: "用户管理",
          url: "/admin/users",
          icon: "RiUserLine",
        },
        {
          title: "资源管理",
          icon: "RiFileList3Line",
          is_expand: true,
          children: [
            {
              title: "资源列表",
              url: "/admin/resources",
            },
            {
              title: "待审核资源",
              url: "/admin/resources/pending",
            },
            {
              title: "分类管理",
              url: "/admin/categories",
            },
            {
              title: "标签管理",
              url: "/admin/tags",
            },
          ],
        },
        {
          title: "订单管理",
          icon: "RiOrderPlayLine",
          is_expand: true,
          children: [
            {
              title: "付费订单",
              url: "/admin/paid-orders",
            },
          ],
        },
        {
          title: "内容管理",
          url: "/admin/posts",
          icon: "RiArticleLine",
        },
        {
          title: "用户反馈",
          url: "/admin/feedbacks",
          icon: "RiMessage2Line",
        },
        {
          title: "统计报告",
          url: "/admin/statistics",
          icon: "RiBarChartLine",
        },
        {
          title: "邮件服务管理",
          url: "/admin/email",
          icon: "RiMailLine",
        },
        {
          title: "系统管理",
          url: "/admin/system",
          icon: "RiSettings3Line",
        },
      ],
    },
    social: {
      items: [
        {
          title: "Home",
          url: "/",
          target: "_blank",
          icon: "RiHomeLine",
        },
        {
          title: "QQ",
          url: "https://qm.qq.com/q/lfdZh1vQFG",
          target: "_blank",
          icon: "RiQqFill",
        },
        {
          title: "QQ",
          url: "https://qm.qq.com/q/lfdZh1vQFG",
          target: "_blank",
          icon: "RiQqFill",
        },
        {
          title: "QQ",
          url: "https://qm.qq.com/q/lfdZh1vQFG",
          target: "_blank",
          icon: "RiQqFill",
        },
      ],
    },
  };

  return <DashboardLayout sidebar={sidebar}>{children}</DashboardLayout>;
}
