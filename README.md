# 文明知识库

基于 Next.js 14 + TypeScript 构建的现代化资源分享平台。

## 功能特性

- 📁 **资源管理** - 上传、分类、搜索、收藏资源
- 👥 **用户系统** - 注册登录、个人中心、积分系统
- 🏷️ **分类标签** - 灵活的分类体系和标签管理
- ⭐ **评价系统** - 评分、评论、收藏功能
- 🔧 **管理后台** - 完整的后台管理功能

## 技术栈

- **前端**: Next.js 14, TypeScript, Tailwind CSS
- **认证**: NextAuth.js
- **数据库**: SQLite/PostgreSQL
- **邮件**: Resend
- **国际化**: 中英文双语支持

### 环境要求
- Node.js 18+
- npm/yarn/pnpm

## 项目结构

```
app/
├── [locale]/           # 国际化路由
│   ├── (admin)/       # 管理后台
│   ├── (auth)/        # 认证页面
│   ├── (default)/     # 主要页面
│   └── api/           # API 路由
├── components/        # React 组件
├── lib/              # 工具库
├── types/            # TypeScript 类型
└── i18n/             # 国际化配置
```

## 部署

### Vercel 部署
1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 自动部署
