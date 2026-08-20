# Euno

Euno 是一个个人导航起始页。前端提供搜索、个人偏好与公共网站入口展示；网站入口后台已拆分为独立的 `nav-admin` 项目。

## 功能

- 首页时钟、问候语与多搜索引擎切换。
- 公共网站入口展示，未登录用户也可读取已启用的入口。
- 登录与会话恢复。
- 登录与会话恢复用于个人用户功能。

## 技术栈

- Next.js 14（App Router）
- React 18 与 TypeScript
- CSS 设计令牌与全局样式
- Radix UI Dialog / Alert Dialog
- dnd-kit（入口排序）

## 本地运行

前置条件：Node.js 18.17 或更高版本，以及 pnpm。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

应用默认运行在 `http://localhost:3000`。生产构建与本地预览：

```bash
pnpm build
pnpm start
```

## 环境变量

在 `.env.local` 中配置：

```bash
# nav-api 服务根地址（不含 /api/v1）
NEXT_PUBLIC_API_URL=http://localhost:8080

# 可选：部署到子路径时使用，与 next.config.js 保持一致
PAGES_BASE_PATH=/nav
NEXT_PUBLIC_BASE_PATH=/nav
```

`NEXT_PUBLIC_API_URL` 未配置时，登录不可用，内容仍保存在当前浏览器。开发时请同时启动相邻的 `nav-api` 项目。

## 路由

| 路径     | 用途         | 访问要求 |
| -------- | ------------ | -------- |
| `/`      | 个人导航首页 | 公开     |
| `/login` | 登录         | 公开     |

## 项目结构

```text
nav-v3/
├── app/
│   ├── login/              # 登录页面
│   ├── globals.css         # 全局及登录样式
│   ├── layout.tsx          # 根布局与元数据
│   └── page.tsx            # 首页路由
├── components/              # 首页与对话框组件
├── lib/
│   ├── api.ts              # nav-api 请求与会话处理
│   ├── constants.ts        # 默认配置
│   └── storage.ts          # 本地偏好存储
├── docs/
│   ├── api-requirements.md
│   └── nav-api-admin-integration.md
└── public/brand/           # 品牌资源
```

## 常用命令

```bash
pnpm dev      # 启动开发服务器
pnpm build    # 生成静态生产构建
pnpm start    # 启动生产服务
pnpm lint     # 执行 Next.js lint
pnpm lint:fix # 自动修复可修复的 lint 问题（包括导入区块顺序）
pnpm format   # 使用 Prettier 格式化项目文件
pnpm format:check # 校验 Prettier 格式
```

`pnpm lint` 还会校验导入代码块：内置模块、第三方模块、`@/` 项目内部模块和相对模块必须依次分组，组间保留空行，且组内按路径字母顺序排列。

## 相关项目与文档

- 后端：[nav-api](../nav-api)
- 管理端：相邻的 `nav-admin` 项目（`admin.eunhacc.cyou`）
- API 需求：[docs/api-requirements.md](docs/api-requirements.md)
- 品牌使用规范：[docs/brand/euno-logo-guidelines.md](docs/brand/euno-logo-guidelines.md)

## 许可证

私有项目。
