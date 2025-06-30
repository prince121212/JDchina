"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number; // 预渲染的额外项目数量
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // 计算可见项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // 总高度
  const totalHeight = items.length * itemHeight;

  // 偏移量
  const offsetY = visibleRange.startIndex * itemHeight;

  if (loading) {
    return (
      <div 
        className={cn("flex items-center justify-center", className)}
        style={{ height: containerHeight }}
      >
        {loadingComponent || (
          <div className="animate-pulse text-muted-foreground">
            加载中...
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div 
        className={cn("flex items-center justify-center", className)}
        style={{ height: containerHeight }}
      >
        {emptyComponent || (
          <div className="text-muted-foreground">
            暂无数据
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={visibleRange.startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleRange.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 无限滚动虚拟列表
interface InfiniteVirtualListProps<T> extends Omit<VirtualListProps<T>, 'items'> {
  items: T[];
  hasNextPage: boolean;
  loadNextPage: () => Promise<void>;
  loadingMore?: boolean;
  threshold?: number; // 触发加载的阈值（距离底部的像素）
}

export function InfiniteVirtualList<T>({
  items,
  hasNextPage,
  loadNextPage,
  loadingMore = false,
  threshold = 200,
  ...virtualListProps
}: InfiniteVirtualListProps<T>) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleScroll = useCallback(async (scrollTop: number) => {
    virtualListProps.onScroll?.(scrollTop);

    // 检查是否需要加载更多
    const totalHeight = items.length * virtualListProps.itemHeight;
    const scrollBottom = scrollTop + virtualListProps.containerHeight;
    
    if (
      hasNextPage &&
      !isLoadingMore &&
      !loadingMore &&
      scrollBottom >= totalHeight - threshold
    ) {
      setIsLoadingMore(true);
      try {
        await loadNextPage();
      } catch (error) {
        console.error('加载更多数据失败:', error);
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [
    items.length,
    virtualListProps.itemHeight,
    virtualListProps.containerHeight,
    virtualListProps.onScroll,
    hasNextPage,
    isLoadingMore,
    loadingMore,
    threshold,
    loadNextPage
  ]);

  return (
    <VirtualList
      {...virtualListProps}
      items={items}
      onScroll={handleScroll}
    />
  );
}

// 网格虚拟列表
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  gap = 0,
  renderItem,
  className,
  overscan = 5,
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  // 计算每行的列数
  const columnsPerRow = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / columnsPerRow);
  const rowHeight = itemHeight + gap;

  // 计算可见行范围
  const visibleRowRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );
    return { startRow, endRow };
  }, [scrollTop, rowHeight, containerHeight, totalRows, overscan]);

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const startIndex = visibleRowRange.startRow * columnsPerRow;
    const endIndex = Math.min(
      items.length - 1,
      (visibleRowRange.endRow + 1) * columnsPerRow - 1
    );
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      originalIndex: startIndex + index,
    }));
  }, [items, visibleRowRange, columnsPerRow]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = totalRows * rowHeight;
  const offsetY = visibleRowRange.startRow * rowHeight;

  return (
    <div
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${columnsPerRow}, ${itemWidth}px)`,
            gap: `${gap}px`,
          }}
        >
          {visibleItems.map(({ item, originalIndex }) => (
            <div key={originalIndex}>
              {renderItem(item, originalIndex)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
