"use client";

import Analytics from "@/components/analytics";
import { CacheKey } from "@/services/constant";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import dynamic from "next/dynamic";
import type { ThemeProviderProps } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { cacheGet } from "@/lib/cache";
import { useAppContext } from "@/contexts/app";
import { useEffect } from "react";

// 动态导入 SignModal，只在客户端渲染
const SignModal = dynamic(() => import("@/components/sign/modal"), {
  ssr: false,
});

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { theme, setTheme } = useAppContext();

  useEffect(() => {
    const themeInCache = cacheGet(CacheKey.Theme);
    if (themeInCache) {
      // theme setted
      if (["dark", "light"].includes(themeInCache)) {
        setTheme(themeInCache);
        return;
      }
    } else {
      // theme not set
      const defaultTheme = process.env.NEXT_PUBLIC_DEFAULT_THEME;
      if (defaultTheme && ["dark", "light"].includes(defaultTheme)) {
        setTheme(defaultTheme);
        return;
      }
    }

    // 检查是否在浏览器环境中
    if (typeof window === 'undefined') {
      // 在服务端环境中使用默认主题
      setTheme("light");
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mediaQuery.matches ? "dark" : "light");

    const handleChange = () => {
      setTheme(mediaQuery.matches ? "dark" : "light");
    };
    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  return (
    <NextThemesProvider forcedTheme={theme} {...props}>
      {children}

      <Toaster position="top-center" richColors />
      <SignModal />
      <Analytics />
    </NextThemesProvider>
  );
}
