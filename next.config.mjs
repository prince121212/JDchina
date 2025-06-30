// 暂时移除所有全局变量设置，避免干扰React运行

import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import mdx from "@next/mdx";
import { fileURLToPath } from 'url';
import path from 'path';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin();

const withMDX = mdx({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  // 性能优化配置
  poweredByHeader: false,
  compress: true,

  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天缓存
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // 实验性功能 - 暂时禁用以解决构建问题
  experimental: {
    // 暂时禁用所有实验性功能
  },
  webpack: (config, { isServer, dev, webpack }) => {
    // 简化的 webpack 配置，专注于解决 self 问题
    if (isServer) {
      // 为服务端设置必要的全局变量，但不覆盖 React 相关的全局变量
      if (typeof global !== 'undefined') {
        // 只在需要时设置 self，不影响 React
        if (!global.self) {
          global.self = global;
        }
      }

      // 在服务器端排除浏览器特有的包
      config.externals = config.externals || [];
      config.externals.push(
        'canvas-confetti',
        'google-one-tap',
        'react-icon-cloud',
        '@uiw/react-md-editor',
        'embla-carousel-auto-scroll',
        'embla-carousel-fade',
        'embla-carousel-react',
        'vaul',
        'framer-motion',
        'react-tweet'
      );
    }

    if (!isServer) {
      // 在客户端构建中排除 Node.js 模块
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        querystring: false,
        path: false,
        child_process: false,
        nodemailer: false,
      };

      // 排除 nodemailer 包
      config.externals = config.externals || [];
      config.externals.push('nodemailer');
    }

    return config;
  },
  async redirects() {
    return [];
  },
};

// Make sure experimental mdx flag is enabled
const configWithMDX = {
  ...nextConfig,
  experimental: {
    ...nextConfig.experimental,
    mdxRs: true,
  },
};

export default withBundleAnalyzer(withNextIntl(withMDX(configWithMDX)));
