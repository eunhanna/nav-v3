# nav-api 公共网站入口与 Admin 后台对接文档

版本：v1  
调用方：`nav-v3`  
服务方：`nav-api`  
用途：为 Euno 首页提供公共网站入口，并为管理员提供 `/admin` 管理能力。

## 1. 对接目标

`nav-v3` 需要 `nav-api` 提供一套全站公共网站入口数据：

- 首页匿名读取已启用的网站入口。
- 管理员登录后新增、编辑、删除、启用/停用和排序。
- 普通用户不能访问管理员接口。
- 管理员权限必须由服务端校验，不能只依赖前端路由保护。

当前首页在接口不可用时会继续使用浏览器 `localStorage` 数据；接口正常后，以服务端公共入口为准。

## 2. 认证与角色

现有登录流程保持不变：

1. `POST /api/v1/auth/code/request`
2. `POST /api/v1/auth/code/verify`
3. 服务端通过 HttpOnly Refresh Cookie 保存刷新会话。
4. 前端调用 `POST /api/v1/auth/refresh` 获取 Access Token。

受保护请求使用：

```http
Authorization: Bearer <access-token>
```

用户信息需要增加角色字段：

```json
{
  "id": "user-id",
  "email": "admin@example.com",
  "role": "admin"
}
```

角色取值：

- `user`：普通用户。
- `admin`：可访问公共网站入口管理接口。

建议在用户表增加：

```sql
role varchar(16) not null default 'user'
```

首个管理员建议由数据库迁移或服务端环境变量初始化，不建议通过前端注册或邮箱字符串判断授予管理员权限。

## 3. 数据模型

建议新增 `public_sites` 表：

```sql
create table public_sites (
  id uuid primary key,
  name varchar(20) not null,
  url varchar(2048) not null,
  category varchar(20) not null,
  icon_url varchar(2048),
  fallback_icon varchar(8) not null default '',
  enabled boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index public_sites_enabled_position_idx
  on public_sites (enabled, position, id);
```

接口中的实体格式：

```ts
interface PublicSite {
  id: string
  name: string
  url: string
  category: string
  iconUrl?: string
  fallbackIcon: string
  enabled: boolean
  position: number
  createdAt: string
  updatedAt: string
}
```

排序规则：先按 `position` 升序，再按 `id` 升序，避免同位置结果不稳定。

## 4. 公共读取接口

### `GET /api/v1/public/sites`

无需登录，只返回 `enabled = true` 的网站。

成功响应：

```json
{
  "sites": [
    {
      "id": "018f4f2a-5d17-7ca2-a3c8-6b31c7abf001",
      "name": "GitHub",
      "url": "https://github.com",
      "category": "工作",
      "iconUrl": null,
      "fallbackIcon": "G",
      "enabled": true,
      "position": 0,
      "createdAt": "2026-08-19T08:00:00Z",
      "updatedAt": "2026-08-19T08:00:00Z"
    }
  ]
}
```

空数据也必须返回 `200`：

```json
{ "sites": [] }
```

## 5. 管理员接口

以下接口都必须验证 Access Token，并要求当前用户 `role = admin`。

### `GET /api/v1/admin/sites`

返回全部网站，包括停用项。

```json
{ "sites": [] }
```

### `POST /api/v1/admin/sites`

请求：

```json
{
  "name": "GitHub",
  "url": "https://github.com",
  "category": "工作",
  "iconUrl": null,
  "fallbackIcon": "G",
  "enabled": true,
  "position": 0
}
```

成功返回 `201`，响应为完整 `PublicSite`。

服务端生成 `id`、`createdAt` 和 `updatedAt`，不接受客户端传入这些字段。

### `PATCH /api/v1/admin/sites/:id`

支持部分更新：

```json
{
  "name": "GitHub",
  "category": "开发工具",
  "enabled": false
}
```

成功返回 `200` 和更新后的完整 `PublicSite`。

### `DELETE /api/v1/admin/sites/:id`

成功返回 `204 No Content`。

目标不存在返回 `404`。

### `PUT /api/v1/admin/sites/reorder`

请求：

```json
{
  "items": [
    { "id": "site-id-1", "position": 0 },
    { "id": "site-id-2", "position": 1 }
  ]
}
```

服务端必须在一个事务中完成：

1. 校验所有 ID 都存在。
2. 校验不能重复 ID。
3. 校验 position 为非负整数且不重复。
4. 批量更新 `position` 和 `updated_at`。

成功返回：

```json
{ "sites": [] }
```

## 6. 校验规则

- `name`：去除首尾空白后 1–20 个 Unicode 字符。
- `url`：必须是绝对 `http` 或 `https` URL，最长 2048 字符。
- `category`：去除首尾空白后 1–20 个 Unicode 字符。
- `iconUrl`：为空或绝对 `http`/`https` URL，最长 2048 字符。
- `fallbackIcon`：0–8 个 Unicode 字符。
- `enabled`：必须是 boolean。
- `position`：必须是非负整数。
- JSON 不允许未知字段，返回 `400 invalid_request`。
- 不允许因为网站 URL 重复而静默覆盖已有数据；如需限制重复，返回明确的 `409 duplicate_site`。

## 7. 错误响应

统一格式：

```json
{
  "error": "forbidden",
  "message": "admin role required"
}
```

状态码：

| 状态码 | error                   | 场景                         |
| ------ | ----------------------- | ---------------------------- |
| 400    | `invalid_request`       | 字段格式、类型或未知字段错误 |
| 401    | `invalid_access_token`  | 缺少、错误或过期 Token       |
| 403    | `forbidden`             | 已登录但不是 admin           |
| 404    | `not_found`             | 目标网站不存在               |
| 409    | `duplicate_site`        | 违反唯一性约束               |
| 409    | `version_conflict`      | 排序或编辑版本冲突           |
| 413    | `document_too_large`    | 请求数据超过服务端限制       |
| 500    | `internal_server_error` | 未预期服务端错误             |

## 8. 并发与缓存

第一版至少需要保证排序更新的事务性。推荐在表中增加 `version integer not null default 0`，编辑和排序请求携带：

```json
{ "expectedVersion": 3 }
```

版本不一致返回 `409 version_conflict`，并返回当前数据：

```json
{
  "error": "version_conflict",
  "current": { "version": 4, "sites": [] }
}
```

公共接口可以使用短缓存，但管理员写入成功后必须能通过以下任一方式失效缓存：

- 主动清除公共接口缓存。
- 使用 `Cache-Control: no-store`。
- 使用不超过 30 秒的短 TTL。

## 9. 安全要求

- 所有 `/admin/*` 接口服务端校验 Token 和 `role = admin`。
- CORS 仅允许正式前端域名。
- 写接口启用 CSRF 防护或严格校验 Origin（如果使用 Cookie 参与认证）。
- URL、图标 URL 只允许 `http`/`https`，禁止 `javascript:`、`data:` 等协议。
- 管理操作写入服务端日志，至少包含用户 ID、接口、资源 ID、结果和时间。
- 不在前端硬编码管理员邮箱或管理员 Token。

## 10. 验收清单

- 普通用户调用任一 admin 接口得到 `403`。
- 无 Token 调用 admin 接口得到 `401`。
- 公共接口无需登录且只返回启用项。
- 新增、编辑、删除后数据可通过公共接口读取。
- 停用入口不会出现在首页公共接口结果中。
- 排序批量更新具备事务性，刷新后顺序不变。
- 两个管理员同时更新时，冲突方收到 `409`，不会覆盖较新的数据。
- 非法 URL、超长名称、未知字段均返回 `400`。
- 数据库重启后公共入口和管理员角色仍然存在。

## 11. 联调顺序

1. `nav-api` 先完成用户 `role` 字段和管理员初始化方式。
2. 在 OpenAPI 中登记本文件的接口和响应结构。
3. 完成数据库迁移、权限中间件和 handler 测试。
4. 提供测试管理员账号和测试环境 API 地址给 `nav-v3`。
5. 使用 `nav-v3` 的 `/admin` 页面完成 CRUD、权限和并发联调。
