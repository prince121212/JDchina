"use client";

import { useEffect, useState } from "react";
import { log } from "@/lib/logger";

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  reportInterval?: number; // 报告间隔（毫秒）
}

export function PerformanceMonitor({ 
  enabled = process.env.NODE_ENV === 'production',
  reportInterval = 30000 // 30秒
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let observer: PerformanceObserver | null = null;
    let reportTimer: NodeJS.Timeout | null = null;

    const collectMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const newMetrics: Partial<PerformanceMetrics> = {
        pageLoadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
      };

      // First Contentful Paint
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        newMetrics.firstContentfulPaint = fcp.startTime;
      }

      setMetrics(prev => ({ ...prev, ...newMetrics }));
    };

    // 收集 Web Vitals
    const observeWebVitals = () => {
      try {
        // Largest Contentful Paint
        observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          setMetrics(prev => ({
            ...prev,
            largestContentfulPaint: lastEntry.startTime
          }));
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          
          setMetrics(prev => ({
            ...prev,
            cumulativeLayoutShift: clsValue
          }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const firstInput = list.getEntries()[0];
          if (firstInput) {
            setMetrics(prev => ({
              ...prev,
              firstInputDelay: (firstInput as any).processingStart - firstInput.startTime
            }));
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

      } catch (error) {
        log.warn("性能监控初始化失败", { error: error as Error });
      }
    };

    // 页面加载完成后收集基础指标
    if (typeof document !== 'undefined') {
      if (document.readyState === 'complete') {
        collectMetrics();
      } else {
        window.addEventListener('load', collectMetrics);
      }
    }

    // 开始观察 Web Vitals
    observeWebVitals();

    // 定期报告性能数据
    reportTimer = setInterval(() => {
      reportPerformanceMetrics(metrics);
    }, reportInterval);

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (reportTimer) {
        clearInterval(reportTimer);
      }
      window.removeEventListener('load', collectMetrics);
    };
  }, [enabled, reportInterval]);

  return null; // 这是一个无UI的监控组件
}

// 报告性能指标
function reportPerformanceMetrics(metrics: Partial<PerformanceMetrics>) {
  if (Object.keys(metrics).length === 0) return;

  // 评估性能等级
  const performanceGrade = evaluatePerformance(metrics);
  
  log.info("页面性能指标", {
    ...metrics,
    grade: performanceGrade,
    url: window.location.pathname,
    userAgent: navigator.userAgent.substring(0, 100),
    timestamp: new Date().toISOString()
  });

  // 如果性能较差，发送警告
  if (performanceGrade === 'poor') {
    log.warn("页面性能较差", {
      metrics,
      url: window.location.pathname,
      suggestions: getPerformanceSuggestions(metrics)
    });
  }
}

// 评估性能等级
function evaluatePerformance(metrics: Partial<PerformanceMetrics>): 'good' | 'needs-improvement' | 'poor' {
  const scores: number[] = [];

  // LCP 评分 (Largest Contentful Paint)
  if (metrics.largestContentfulPaint !== undefined) {
    if (metrics.largestContentfulPaint <= 2500) scores.push(100);
    else if (metrics.largestContentfulPaint <= 4000) scores.push(50);
    else scores.push(0);
  }

  // FID 评分 (First Input Delay)
  if (metrics.firstInputDelay !== undefined) {
    if (metrics.firstInputDelay <= 100) scores.push(100);
    else if (metrics.firstInputDelay <= 300) scores.push(50);
    else scores.push(0);
  }

  // CLS 评分 (Cumulative Layout Shift)
  if (metrics.cumulativeLayoutShift !== undefined) {
    if (metrics.cumulativeLayoutShift <= 0.1) scores.push(100);
    else if (metrics.cumulativeLayoutShift <= 0.25) scores.push(50);
    else scores.push(0);
  }

  // FCP 评分 (First Contentful Paint)
  if (metrics.firstContentfulPaint !== undefined) {
    if (metrics.firstContentfulPaint <= 1800) scores.push(100);
    else if (metrics.firstContentfulPaint <= 3000) scores.push(50);
    else scores.push(0);
  }

  if (scores.length === 0) return 'needs-improvement';

  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  if (averageScore >= 80) return 'good';
  if (averageScore >= 50) return 'needs-improvement';
  return 'poor';
}

// 获取性能优化建议
function getPerformanceSuggestions(metrics: Partial<PerformanceMetrics>): string[] {
  const suggestions: string[] = [];

  if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 4000) {
    suggestions.push("优化最大内容绘制时间：压缩图片、使用CDN、优化服务器响应时间");
  }

  if (metrics.firstInputDelay && metrics.firstInputDelay > 300) {
    suggestions.push("优化首次输入延迟：减少JavaScript执行时间、使用Web Workers");
  }

  if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.25) {
    suggestions.push("优化累积布局偏移：为图片和广告设置尺寸、避免动态插入内容");
  }

  if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > 3000) {
    suggestions.push("优化首次内容绘制：减少关键资源、内联关键CSS、优化字体加载");
  }

  if (metrics.pageLoadTime && metrics.pageLoadTime > 5000) {
    suggestions.push("优化页面加载时间：启用压缩、使用缓存、减少HTTP请求");
  }

  return suggestions;
}

// 性能监控Hook
export function usePerformanceMonitoring() {
  const [isSupported, setIsSupported] = useState(false);
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});

  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' && 
      'performance' in window && 
      'PerformanceObserver' in window
    );
  }, []);

  const measurePageLoad = () => {
    if (!isSupported || typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setMetrics({
        pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      });
    }
  };

  return {
    isSupported,
    metrics,
    measurePageLoad,
  };
}
