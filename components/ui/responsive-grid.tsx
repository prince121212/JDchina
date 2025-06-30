"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    "2xl"?: number;
  };
  gap?: number;
  minItemWidth?: number;
}

export function ResponsiveGrid({
  children,
  className,
  cols = {
    default: 1,
    sm: 2,
    md: 2,
    lg: 3,
    xl: 4,
    "2xl": 5,
  },
  gap = 6,
  minItemWidth,
}: ResponsiveGridProps) {
  // 构建网格类名
  const gridClasses = [
    `gap-${gap}`,
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols["2xl"] && `2xl:grid-cols-${cols["2xl"]}`,
  ].filter(Boolean);

  // 如果设置了最小宽度，使用 auto-fit
  const gridStyle = minItemWidth
    ? {
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`,
        gap: `${gap * 0.25}rem`,
      }
    : undefined;

  return (
    <div
      className={cn(
        "grid",
        !minItemWidth && gridClasses,
        className
      )}
      style={gridStyle}
    >
      {children}
    </div>
  );
}

// 预定义的网格布局
export const gridLayouts = {
  // 资源卡片网格
  resources: {
    default: 1,
    sm: 2,
    md: 2,
    lg: 3,
    xl: 4,
    "2xl": 5,
  },
  
  // 分类网格
  categories: {
    default: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
    "2xl": 6,
  },
  
  // 紧凑型网格
  compact: {
    default: 2,
    sm: 3,
    md: 4,
    lg: 5,
    xl: 6,
    "2xl": 7,
  },
  
  // 宽松型网格
  spacious: {
    default: 1,
    sm: 1,
    md: 2,
    lg: 2,
    xl: 3,
    "2xl": 3,
  },
};

// 资源网格组件
export function ResourceGrid({
  children,
  className,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "compact" | "spacious";
}) {
  const layouts = {
    default: gridLayouts.resources,
    compact: gridLayouts.compact,
    spacious: gridLayouts.spacious,
  };

  return (
    <ResponsiveGrid
      cols={layouts[variant]}
      gap={variant === "compact" ? 4 : 6}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
}

// 分类网格组件
export function CategoryGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ResponsiveGrid
      cols={gridLayouts.categories}
      gap={4}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
}

// 自适应网格组件（基于最小宽度）
export function AutoGrid({
  children,
  className,
  minItemWidth = 280,
  gap = 6,
}: {
  children: ReactNode;
  className?: string;
  minItemWidth?: number;
  gap?: number;
}) {
  return (
    <ResponsiveGrid
      minItemWidth={minItemWidth}
      gap={gap}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
}

// 瀑布流网格组件
export function MasonryGrid({
  children,
  className,
  columns = {
    default: 1,
    sm: 2,
    md: 3,
    lg: 4,
  },
}: {
  children: ReactNode;
  className?: string;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}) {
  const columnClasses = [
    columns.default && `columns-${columns.default}`,
    columns.sm && `sm:columns-${columns.sm}`,
    columns.md && `md:columns-${columns.md}`,
    columns.lg && `lg:columns-${columns.lg}`,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "gap-6",
        columnClasses,
        className
      )}
    >
      {children}
    </div>
  );
}
