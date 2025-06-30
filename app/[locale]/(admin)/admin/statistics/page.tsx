import { getUserUuid, getUserEmail } from "@/services/user";
import { redirect } from "next/navigation";
import Header from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getResourcesStats, getResourceStatsByCategory } from "@/models/resource";
import { getAllCategories } from "@/models/category";
import { getAllTags } from "@/models/tag";
import { getUsers } from "@/models/user";
import { getAuditLogStats } from "@/models/audit-log";
import { Progress } from "@/components/ui/progress";
import moment from "moment";

export default async function AdminStatisticsPage() {
  const user_uuid = await getUserUuid();
  const user_email = await getUserEmail();

  const callbackUrl = `/admin/statistics`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 检查管理员权限
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  const isAdmin = adminEmails.includes(user_email);

  if (!isAdmin) {
    redirect('/');
  }

  // 获取统计数据
  const [resourcesStats, categories, tags, users, auditStats, categoryStats] = await Promise.all([
    getResourcesStats(),
    getAllCategories(),
    getAllTags(),
    getUsers(1, 1000), // 获取更多用户数据用于统计
    getAuditLogStats().catch(() => ({ total: 0, today: 0, thisWeek: 0, thisMonth: 0, topActions: [] })),
    getResourceStatsByCategory()
  ]);

  const crumb = {
    items: [
      { title: "管理后台", url: "/admin" },
      { title: "统计报告", is_active: true }
    ]
  };

  // 计算审核通过率
  const approvalRate = resourcesStats.total > 0 
    ? Math.round((resourcesStats.approved / resourcesStats.total) * 100) 
    : 0;

  // 获取前5个最热门的分类
  const topCategories = categoryStats.slice(0, 5);

  return (
    <>
      <Header crumb={crumb} />
      <div className="w-full px-4 md:px-8 py-8 space-y-8">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">统计报告</h1>
          <p className="text-muted-foreground">
            平台运营数据概览和详细统计信息
          </p>
        </div>

        {/* 核心指标 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总资源数</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resourcesStats.total}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="default" className="text-xs">
                  已通过: {resourcesStats.approved}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  待审核: {resourcesStats.pending}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">用户活跃度</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                注册用户总数
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总浏览量</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resourcesStats.totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                累计浏览次数
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总访问量</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resourcesStats.totalAccess.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                累计访问次数
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 详细统计 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 审核统计 */}
          <Card>
            <CardHeader>
              <CardTitle>审核统计</CardTitle>
              <CardDescription>
                资源审核情况和通过率分析
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">审核通过率</span>
                <span className="text-sm text-muted-foreground">{approvalRate}%</span>
              </div>
              <Progress value={approvalRate} className="w-full" />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{resourcesStats.approved}</div>
                  <div className="text-xs text-muted-foreground">已通过</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{resourcesStats.pending}</div>
                  <div className="text-xs text-muted-foreground">待审核</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{resourcesStats.rejected}</div>
                  <div className="text-xs text-muted-foreground">已拒绝</div>
                </div>
              </div>

              {auditStats.total > 0 && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">审核活动</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>今日审核</span>
                      <span>{auditStats.today}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>本周审核</span>
                      <span>{auditStats.thisWeek}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 分类统计 */}
          <Card>
            <CardHeader>
              <CardTitle>分类统计</CardTitle>
              <CardDescription>
                资源分类分布情况
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{categories.length}</div>
                  <div className="text-xs text-muted-foreground">总分类数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{tags.length}</div>
                  <div className="text-xs text-muted-foreground">总标签数</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">热门分类</div>
                {topCategories.map((category, index) => (
                  <div key={category.categoryId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm">{category.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        {category.resourceCount}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        资源
                      </span>
                    </div>
                  </div>
                ))}
                {topCategories.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    暂无分类数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 热门操作统计 */}
        {auditStats.topActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>热门操作</CardTitle>
              <CardDescription>
                本月最常执行的操作统计
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditStats.topActions.map((action, index) => (
                  <div key={action.action} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm">{action.action}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {action.count} 次
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
