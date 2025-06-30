"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  Home, 
  Search, 
  Upload, 
  Heart, 
  User,
  Grid3X3,
  Tag,
  Folder,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/app";

interface MobileNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requireAuth?: boolean;
}

const navItems: MobileNavItem[] = [
  {
    title: "首页",
    href: "/",
    icon: Home,
  },
  {
    title: "资源库",
    href: "/resources",
    icon: Search,
  },
  {
    title: "分类",
    href: "/categories",
    icon: Folder,
  },
  {
    title: "标签",
    href: "/tags",
    icon: Tag,
  },

  {
    title: "我的收藏",
    href: "/my-favorites",
    icon: Heart,
    requireAuth: true,
  },
  {
    title: "用户中心",
    href: "/user-center",
    icon: User,
    requireAuth: true,
  },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAppContext();

  const filteredNavItems = navItems.filter(item => 
    !item.requireAuth || user
  );

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative touch-target">
            <Menu className="h-5 w-5" />
            <span className="sr-only">打开菜单</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Grid3X3 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">文明知识库</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 用户信息 */}
            {user && (
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{user.nickname || "用户"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 导航菜单 */}
            <nav className="flex-1 p-4">
              <div className="space-y-2">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || 
                    (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* 底部操作 */}
            <div className="p-4 border-t">
              {!user ? (
                <div className="space-y-2">
                  <Link href="/auth/signin" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">登录</Button>
                  </Link>
                  <Link href="/auth/signup" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">注册</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href="/my-uploads" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      我的上传
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => {
                      // TODO: 实现登出逻辑
                      setIsOpen(false);
                    }}
                  >
                    退出登录
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// 底部导航栏（移动端）
export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAppContext();

  const bottomNavItems = [
    {
      title: "首页",
      href: "/",
      icon: Home,
    },
    {
      title: "资源",
      href: "/resources",
      icon: Search,
    },

    {
      title: "收藏",
      href: "/my-favorites",
      icon: Heart,
      requireAuth: true,
    },
    {
      title: "我的",
      href: "/user-center",
      icon: User,
      requireAuth: true,
    },
  ];

  const filteredItems = bottomNavItems.filter(item => 
    !item.requireAuth || user
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <nav className="flex items-center justify-around py-2">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium truncate">
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
