import { log } from "@/lib/logger";

// CDN配置和缓存策略
export interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  cacheRules: CacheRule[];
  imageOptimization: ImageOptimizationConfig;
  compression: CompressionConfig;
}

export interface CacheRule {
  pattern: string;
  maxAge: number; // 秒
  staleWhileRevalidate?: number; // 秒
  mustRevalidate?: boolean;
}

export interface ImageOptimizationConfig {
  enabled: boolean;
  formats: ('webp' | 'avif' | 'jpeg' | 'png')[];
  quality: number;
  maxWidth: number;
  maxHeight: number;
  autoOptimize: boolean;
}

export interface CompressionConfig {
  enabled: boolean;
  gzip: boolean;
  brotli: boolean;
  minSize: number; // 字节
}

// 默认CDN配置
export const defaultCDNConfig: CDNConfig = {
  enabled: process.env.NODE_ENV === 'production',
  baseUrl: process.env.STORAGE_PUBLIC_URL || '',
  cacheRules: [
    // 图片文件 - 长期缓存
    {
      pattern: '\\.(jpg|jpeg|png|gif|webp|avif|svg)$',
      maxAge: 31536000, // 1年
      staleWhileRevalidate: 86400, // 1天
    },
    // 视频文件 - 长期缓存
    {
      pattern: '\\.(mp4|webm|ogg|avi|mov)$',
      maxAge: 31536000, // 1年
      staleWhileRevalidate: 86400, // 1天
    },
    // 音频文件 - 长期缓存
    {
      pattern: '\\.(mp3|wav|ogg|aac|flac)$',
      maxAge: 31536000, // 1年
      staleWhileRevalidate: 86400, // 1天
    },
    // 文档文件 - 中期缓存
    {
      pattern: '\\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$',
      maxAge: 86400, // 1天
      staleWhileRevalidate: 3600, // 1小时
    },
    // 压缩文件 - 中期缓存
    {
      pattern: '\\.(zip|rar|7z|tar|gz)$',
      maxAge: 86400, // 1天
      staleWhileRevalidate: 3600, // 1小时
    },
    // 其他文件 - 短期缓存
    {
      pattern: '.*',
      maxAge: 3600, // 1小时
      staleWhileRevalidate: 300, // 5分钟
    },
  ],
  imageOptimization: {
    enabled: true,
    formats: ['webp', 'avif', 'jpeg'],
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    autoOptimize: true,
  },
  compression: {
    enabled: true,
    gzip: true,
    brotli: true,
    minSize: 1024, // 1KB
  },
};

// CDN管理器
export class CDNManager {
  private config: CDNConfig;

  constructor(config: CDNConfig = defaultCDNConfig) {
    this.config = config;
  }

  // 生成CDN URL
  generateCDNUrl(key: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  } = {}): string {
    if (!this.config.enabled || !this.config.baseUrl) {
      return `${this.config.baseUrl}/${key}`;
    }

    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    let url = `${baseUrl}/${key}`;

    // 如果是图片且启用了优化
    if (this.config.imageOptimization.enabled && this.isImageFile(key)) {
      const params = new URLSearchParams();

      if (options.width) params.set('w', options.width.toString());
      if (options.height) params.set('h', options.height.toString());
      if (options.quality) params.set('q', options.quality.toString());
      if (options.format) params.set('f', options.format);
      if (options.fit) params.set('fit', options.fit);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return url;
  }

  // 获取文件的缓存规则
  getCacheRule(key: string): CacheRule {
    for (const rule of this.config.cacheRules) {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(key)) {
        return rule;
      }
    }
    
    // 默认规则
    return this.config.cacheRules[this.config.cacheRules.length - 1];
  }

  // 生成缓存头
  generateCacheHeaders(key: string): Record<string, string> {
    const rule = this.getCacheRule(key);
    const headers: Record<string, string> = {};

    headers['Cache-Control'] = `public, max-age=${rule.maxAge}`;
    
    if (rule.staleWhileRevalidate) {
      headers['Cache-Control'] += `, stale-while-revalidate=${rule.staleWhileRevalidate}`;
    }
    
    if (rule.mustRevalidate) {
      headers['Cache-Control'] += ', must-revalidate';
    }

    // 添加ETag支持
    headers['ETag'] = `"${this.generateETag(key)}"`;
    
    // 添加Vary头
    if (this.isImageFile(key)) {
      headers['Vary'] = 'Accept, Accept-Encoding';
    }

    return headers;
  }

  // 生成ETag
  private generateETag(key: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(key + Date.now()).digest('hex').substring(0, 8);
  }

  // 检查是否为图片文件
  private isImageFile(key: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
    const extension = key.toLowerCase().substring(key.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  }

  // 预热CDN缓存
  async warmupCache(keys: string[]): Promise<void> {
    if (!this.config.enabled) {
      log.info("CDN未启用，跳过缓存预热");
      return;
    }

    log.info("开始CDN缓存预热", { count: keys.length });

    const promises = keys.map(async (key) => {
      try {
        const url = this.generateCDNUrl(key);
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          log.debug("CDN缓存预热成功", { key, url });
        } else {
          log.warn("CDN缓存预热失败", { key, url, status: response.status });
        }
      } catch (error) {
        log.error("CDN缓存预热错误", error as Error, { key });
      }
    });

    await Promise.allSettled(promises);
    log.info("CDN缓存预热完成", { count: keys.length });
  }

  // 清除CDN缓存
  async purgeCache(keys: string[]): Promise<void> {
    if (!this.config.enabled) {
      log.info("CDN未启用，跳过缓存清除");
      return;
    }

    // 这里可以集成具体的CDN提供商API
    // 例如Cloudflare、AWS CloudFront等
    log.info("CDN缓存清除请求", { keys });
    
    // TODO: 实现具体的CDN缓存清除逻辑
    // 对于Cloudflare R2，可以使用Cloudflare API
  }

  // 获取CDN统计信息
  async getStats(): Promise<{
    enabled: boolean;
    baseUrl: string;
    cacheRulesCount: number;
    imageOptimizationEnabled: boolean;
    compressionEnabled: boolean;
  }> {
    return {
      enabled: this.config.enabled,
      baseUrl: this.config.baseUrl,
      cacheRulesCount: this.config.cacheRules.length,
      imageOptimizationEnabled: this.config.imageOptimization.enabled,
      compressionEnabled: this.config.compression.enabled,
    };
  }
}

// 导出默认实例
export const cdnManager = new CDNManager();

// 工具函数：生成响应式图片URL
export function generateResponsiveImageUrls(key: string, sizes: number[] = [320, 640, 1024, 1920]): {
  src: string;
  srcSet: string;
  sizes: string;
} {
  const src = cdnManager.generateCDNUrl(key);
  
  const srcSet = sizes
    .map(size => `${cdnManager.generateCDNUrl(key, { width: size, format: 'webp' })} ${size}w`)
    .join(', ');
  
  const sizesAttr = sizes
    .map((size, index) => {
      if (index === sizes.length - 1) return `${size}px`;
      return `(max-width: ${size}px) ${size}px`;
    })
    .join(', ');

  return {
    src,
    srcSet,
    sizes: sizesAttr,
  };
}
