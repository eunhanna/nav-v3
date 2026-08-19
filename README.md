# EUNHANNA

EUNHANNA 的个人导航启动页 — 快速定位，零摩擦访问常用网站。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **字体**: Inter

## 功能特点

- **时钟显示**: 页面中心大号时钟，采用轻量字重 (200) 和负字间距设计
- **多引擎搜索**: 支持 Google、百度、Bing 搜索引擎切换
- **网站导航**: 可自定义的网站网格，支持添加/删除常用网站
- **响应式布局**: 适配桌面和移动设备
- **本地存储**: 网站列表和搜索引擎偏好保存在 localStorage

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

后端服务已拆分为独立的 `nav-api` 项目，包含 Go API、PostgreSQL 迁移以及 Docker/Caddy 部署配置。

本地联调认证接口时，可以设置：

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

线上后端服务地址为：

```bash
NEXT_PUBLIC_API_URL=https://api.eunhacc.cyou
```

## 项目结构

```
nav-v3/
├── app/                # Next.js App Router
│   ├── globals.css     # 全局样式
│   ├── layout.tsx      # 根布局
│   └── page.tsx        # 首页
├── components/         # React 组件
│   ├── Background.tsx  # 渐变背景
│   ├── Clock.tsx       # 时钟组件
│   ├── Search.tsx      # 搜索栏
│   ├── SiteGrid.tsx    # 网站网格
│   ├── SiteCard.tsx    # 网站卡片
│   └── AddSiteModal.tsx # 添加网站弹窗
├── lib/                # 工具函数
│   ├── constants.ts    # 常量定义
│   └── storage.ts      # 本地存储
└── DESIGN_NOTES.md     # 设计规范
```

## 设计理念

- **极简主义**: 去除装饰性元素，专注于核心功能
- **高对比度**: 确保文字可读性 (WCAG 标准)
- **苹果风格圆角**: 22.37% 圆角半径，连续曲率设计
- **呼吸感**: 时钟作为视觉锚点，周围留有充足空间

## 默认网站

预置 8 个开发者常用网站：Google、GitHub、YouTube、Bilibili、知乎、掘金、Twitter、Stack Overflow。

## 许可证

私有项目
