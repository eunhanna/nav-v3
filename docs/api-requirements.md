# nav-v3 后端接口需求

状态：待 nav-api 实现  
需求方：nav-v3  
实现方：nav-api  
契约版本：v1

## 1. 现状与范围

nav-v3 当前只有认证请求会访问 nav-api；站点、分类、搜索引擎、主题、壁纸和界面开关均保存在浏览器 `localStorage`。

已经调用且 nav-api 已实现的接口：

| 方法 | 路径                        | 用途                                |
| ---- | --------------------------- | ----------------------------------- |
| POST | `/api/v1/auth/code/request` | 申请 6 位邮箱登录验证码             |
| POST | `/api/v1/auth/code/verify`  | 验证登录码并取得会话                |
| POST | `/api/v1/auth/refresh`      | 用 HttpOnly Refresh Cookie 恢复会话 |
| POST | `/api/v1/auth/logout`       | 注销会话                            |

nav-api 已实现但 nav-v3 暂未调用：

| 方法 | 路径         | 用途                             |
| ---- | ------------ | -------------------------------- |
| GET  | `/api/v1/me` | 校验 Access Token 并取得当前用户 |

本期新增需求只有“用户导航文档同步”。搜索跳转、favicon、时钟和壁纸采样均在客户端完成，不需要后端接口。

## 2. 新增接口

### 2.1 读取导航文档

`GET /api/v1/document`

请求头：

```http
Authorization: Bearer <access-token>
```

成功响应 `200`：

```json
{
  "version": 3,
  "updatedAt": "2026-08-17T10:00:00Z",
  "document": {
    "schemaVersion": 1,
    "sites": [
      {
        "id": "018f4f2a-5d17-7ca2-a3c8-6b31c7abf001",
        "name": "GitHub",
        "url": "https://github.com",
        "categoryId": "018f4f2a-5d17-7ca2-a3c8-6b31c7abf101",
        "color": "#d8dee9",
        "icon": "G",
        "position": 0
      }
    ],
    "categories": [
      {
        "id": "018f4f2a-5d17-7ca2-a3c8-6b31c7abf101",
        "name": "工作",
        "position": 0
      }
    ],
    "preferences": {
      "engine": "百度",
      "theme": "mint",
      "wallpaper": 0,
      "seconds": false,
      "greeting": true
    }
  }
}
```

首次登录且没有云端文档时也返回 `200`，其中 `version` 为 `0`，`sites`、`categories` 为空，`preferences` 使用服务端认可的默认值。前端据此决定是否上传本地数据，不能通过 `404` 猜测状态。

### 2.2 保存导航文档

`PUT /api/v1/document`

请求头：

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

请求体：

```json
{
  "expectedVersion": 3,
  "document": {
    "schemaVersion": 1,
    "sites": [],
    "categories": [],
    "preferences": {
      "engine": "百度",
      "theme": "mint",
      "wallpaper": 0,
      "seconds": false,
      "greeting": true
    }
  }
}
```

成功响应 `200` 返回与读取接口相同的完整响应，`version` 原子递增。

当 `expectedVersion` 与服务端当前版本不一致时返回 `409`，并返回当前服务端快照：

```json
{
  "error": "version_conflict",
  "current": {
    "version": 4,
    "updatedAt": "2026-08-17T10:01:00Z",
    "document": {}
  }
}
```

nav-v3 收到冲突后必须停止自动覆盖，先基于 `current` 合并或提示用户选择。

## 3. 数据规则

- 所有新增实体 ID 使用字符串 UUID；不能继续把 `Date.now()` 数字作为云端 ID。
- `schemaVersion` 当前固定为 `1`。
- 分类名：去除首尾空白后 1–10 个 Unicode 字符，同一文档内不可重复。
- 站点名：去除首尾空白后 1–20 个 Unicode 字符。
- URL：仅允许绝对 `http` 或 `https` URL，最长 2048 字符。
- `color`：格式为 `#[0-9a-fA-F]{6}`。
- `icon`：0–8 个 Unicode 字符。
- `position`：非负整数；排序先按 `position`，再按 ID，避免同位置时结果不稳定。
- `categoryId` 必须引用同一文档内存在的分类。
- `engine` 仅允许 `百度`、`Bing`、`Google`、`DuckDuckGo`。
- `theme` 仅允许 `mint`、`ocean`、`amber`、`morning`、`editorial`。
- `wallpaper` 当前允许 0–3。
- `activeCategory` 和 `editing` 属于当前设备的临时 UI 状态，不上传云端。
- 整份文档序列化后不得超过 2 MiB；nav-api 数据库迁移已存在相同上限。
- JSON 出现未知字段时返回 `400 invalid_request`，防止拼写错误被静默丢弃。

## 4. 通用响应

| 状态码 | error                   | 含义                            |
| ------ | ----------------------- | ------------------------------- |
| 400    | `invalid_request`       | JSON、字段或引用关系不合法      |
| 401    | `invalid_access_token`  | 缺少、失效或错误的 Access Token |
| 409    | `version_conflict`      | 乐观锁版本冲突                  |
| 413    | `document_too_large`    | 文档超过 2 MiB                  |
| 500    | `internal_server_error` | 未预期服务端错误                |

认证后的请求都使用 Bearer Access Token。若返回 `401`，nav-v3 先调用一次 `/auth/refresh`，成功后只重试原请求一次。

## 5. 验收标准

- 两个不同用户读写的数据严格隔离。
- 新用户读取返回确定的空文档，而不是 `404`。
- 版本匹配时保存成功且版本恰好加一。
- 两个客户端从相同版本并发保存时只有一个成功，另一个得到 `409` 和当前快照。
- 非法 URL、悬空 `categoryId`、重复分类名、未知主题均返回 `400`。
- 超过 2 MiB 返回 `413`。
- 无 Token、坏 Token、过期 Token 均返回 `401`。
- GET/PUT 的请求与响应结构写入 nav-api 的 OpenAPI 文件，并有 handler 测试与存储适配器测试。

## 6. 两项目协作约定

1. `nav-api/openapi.yaml` 是唯一可执行契约；接口实现和 nav-v3 客户端都以它为准。
2. nav-v3 的新需求先修改本文件并提交需求变更；nav-api 接受后先改 OpenAPI，再写实现。
3. nav-api 的合并请求必须标注兼容性：`compatible`、`deprecated` 或 `breaking`。破坏性变化必须新开 `/api/v2`，不能原地改变 v1。
4. nav-api CI 校验 OpenAPI，并对基准分支运行 breaking-change 检查；nav-v3 CI 从固定版本的契约生成 TypeScript 类型并执行类型检查。
5. nav-api 发布不可变契约版本（Git tag 或制品，如 `nav-api-contract@1.2.0`）；nav-v3 只通过显式升级版本获知变化，禁止人工复制类型。
6. 联调期使用契约测试：nav-api 用 OpenAPI 验证响应，nav-v3 用同一契约启动 mock server。这样任一方变更都会在 CI 中暴露，而不是依赖口头通知。

## 7. 实施顺序

1. nav-api：补 PostgreSQL 连接和认证存储适配器，避免现有内存认证在重启后失效。
2. nav-api：提交 `openapi.yaml`，实现 `GET/PUT /api/v1/document`、乐观锁和校验。
3. nav-v3：将本地 `AppState` 升级为 UUID/分类对象模型，增加本地到 schema v1 的一次性迁移。
4. nav-v3：登录后执行首次同步，并用防抖保存替代纯 localStorage 保存。
5. 两边：接入契约校验、breaking-change 检查和契约版本升级流程。

## 8. 公共入口与管理员后台

`AuthUser` 需要增加 `role` 字段，取值为 `user` 或 `admin`。管理员接口必须在服务端校验角色，前端路由保护不能作为权限边界。

| 方法   | 路径                          | 用途                         |
| ------ | ----------------------------- | ---------------------------- |
| GET    | `/api/v1/public/sites`        | 首页读取已启用的公共网站入口 |
| GET    | `/api/v1/admin/sites`         | 管理员读取全部网站入口       |
| POST   | `/api/v1/admin/sites`         | 管理员新增网站入口           |
| PATCH  | `/api/v1/admin/sites/:id`     | 管理员编辑网站入口           |
| DELETE | `/api/v1/admin/sites/:id`     | 管理员删除网站入口           |
| PUT    | `/api/v1/admin/sites/reorder` | 管理员保存网站排序           |

管理员接口返回 `403` 表示已登录但不是管理员；公共接口不要求登录。网站实体包含 `id`、`name`、`url`、`category`、`iconUrl`、`fallbackIcon`、`enabled`、`position`、`createdAt` 和 `updatedAt`。
