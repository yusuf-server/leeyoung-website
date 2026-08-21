# 头像持久化修复 - 更新说明

## 问题描述

用户上传头像后，在账户设置页面可以看到头像，但是切换到其他页面再回来时，头像又不显示了。

## 根本原因

1. 头像上传时保存到了 WordPress 用户 meta (`custom_avatar`)
2. 但是 session API 从 WooCommerce 客户数据读取头像
3. WooCommerce 客户数据中没有自定义头像字段
4. 导致每次重新加载页面时，无法获取到已上传的头像

## 解决方案

### 1. WordPress 插件更新

在 `avatar-upload-api.php` 中添加了新的端点：`/wp-json/custom/v1/get-avatar`

**新功能：**
- GET 请求获取用户的自定义头像
- 从 WordPress 用户 meta 读取 `custom_avatar`
- 如果没有自定义头像，返回默认头像
- 支持 JWT 认证

**代码：**
```php
function handle_get_avatar($request) {
    // 验证用户身份（JWT token）
    // 从 user meta 读取 custom_avatar
    // 如果存在，返回自定义头像 URL
    // 否则返回默认头像
}
```

### 2. Session API 更新

更新了 `/src/pages/api/auth/session.ts`：

**改动：**
- 添加调用新的 `/wp-json/custom/v1/get-avatar` 端点
- 头像优先级：自定义头像 > WooCommerce 头像 > 默认头像
- 确保每次检查 session 时都能获取到最新的自定义头像

**代码逻辑：**
```typescript
// 1. 获取 WooCommerce 客户数据
const wooCustomer = await fetch('/wc/v3/customers/{id}');

// 2. 获取自定义头像
const avatarData = await fetch('/custom/v1/get-avatar', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. 优先级排序
const avatarUrl = customAvatar || wooCustomer?.avatar_url || defaultAvatar;
```

## 工作流程

```
用户登录
    │
    ▼
访问任何页面
    │
    ▼
调用 /api/auth/session
    │
    ├─── 获取 WooCommerce 客户数据
    │
    └─── 调用 /wp-json/custom/v1/get-avatar
         │
         └─── 从 WordPress user meta 读取 custom_avatar
              │
              ▼
         返回自定义头像 URL
    │
    ▼
页面显示正确的头像
```

## 数据存储

### WordPress 数据库
```
wp_usermeta 表:
├── user_id: 123
├── meta_key: 'custom_avatar'
└── meta_value: 'https://imanmlhijab.com/wp-content/uploads/2026/07/avatar-123.jpg'
```

### Session Cookie
```json
{
  "userId": 123,
  "username": "user",
  "token": "eyJhbGc...",
  "email": "user@example.com"
}
```

### Session API Response
```json
{
  "authenticated": true,
  "user": {
    "id": 123,
    "username": "user",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://imanmlhijab.com/wp-content/uploads/2026/07/avatar-123.jpg"
  }
}
```

## 安装步骤

### ⚠️ 重要：需要更新 WordPress 插件

由于 WordPress 插件添加了新的端点，你需要：

1. **删除旧的插件文件**：
   - 在 WordPress 后台停用并删除 "Avatar Upload API" 插件
   - 或通过 FTP 删除 `/wp-content/plugins/avatar-upload-api.php`

2. **上传新的插件文件**：
   - 上传更新后的 `avatar-upload-api.php` 到 `/wp-content/plugins/`
   - 文件位置：项目根目录的 `avatar-upload-api.php`

3. **重新激活插件**：
   - 在 WordPress 后台 → 插件 → 已安装的插件
   - 找到 "Avatar Upload API"
   - 点击"激活"

4. **验证新端点**：
   ```bash
   curl https://imanmlhijab.com/wp-json/custom/v1/get-avatar \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### 前端代码（自动生效）

前端代码已经自动更新，不需要额外操作。重启开发服务器即可：

```bash
npm run dev
```

## 测试步骤

### 1. 测试头像上传
- 访问：`http://localhost:4321/account/settings`
- 点击头像上的相机图标
- 上传一张图片
- 应该看到成功消息

### 2. 测试头像持久化
- 上传头像后，点击导航栏的 "My Orders"
- 再点击 "Account Settings" 返回
- **头像应该仍然显示**（之前会消失）

### 3. 测试跨页面显示
- 访问首页 `/`
- 查看右上角用户头像（如果已登录）
- 点击头像查看下拉菜单
- 下拉菜单中的头像应该显示自定义头像

### 4. 测试刷新页面
- 在账户设置页面按 F5 刷新
- 头像应该立即显示，不会闪烁或消失

## API 端点总结

### 上传头像
```http
POST /wp-json/custom/v1/upload-avatar
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

avatar: [image file]
```

### 获取头像
```http
GET /wp-json/custom/v1/get-avatar
Authorization: Bearer {jwt_token}
```

**响应（有自定义头像）：**
```json
{
  "success": true,
  "avatar_url": "https://imanmlhijab.com/wp-content/uploads/2026/07/avatar-123.jpg",
  "avatar_id": 456,
  "user_id": 123,
  "source": "custom"
}
```

**响应（无自定义头像）：**
```json
{
  "success": true,
  "avatar_url": "https://ui-avatars.com/api/?name=User&size=96&background=000&color=fff",
  "avatar_id": null,
  "user_id": 123,
  "source": "default"
}
```

## 更新的文件

### WordPress 插件
- `avatar-upload-api.php` - 添加 `handle_get_avatar()` 函数和新端点

### Astro 项目
- `src/pages/api/auth/session.ts` - 添加获取自定义头像的逻辑
- `src/pages/api/account/get-avatar.ts` - 新建（备用端点，未使用）

## 性能考虑

每次调用 `/api/auth/session` 时，会额外请求一次 WordPress：

```
Session API 调用
    │
    ├─── WooCommerce 客户数据（已有）
    │
    └─── 自定义头像（新增） ← 额外的 HTTP 请求
```

**优化建议（未来）：**
1. 缓存头像 URL 在 session cookie 中
2. 只在头像更新后刷新 session
3. 使用 WordPress transients 缓存用户 meta
4. 考虑使用 Redis 缓存

## 兼容性

✅ 向后兼容：如果用户没有上传自定义头像，系统会自动使用默认头像
✅ 优雅降级：如果 WordPress 插件未安装，会使用 WooCommerce 或默认头像
✅ 错误处理：所有网络请求都有 try-catch 包裹

## 故障排查

### 头像仍然不显示

**检查项：**
1. WordPress 插件是否已更新并激活？
2. 浏览器控制台是否有错误？
3. 网络请求中 `/custom/v1/get-avatar` 是否返回 200？

**调试命令：**
```javascript
// 在浏览器控制台运行
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => console.log('Avatar URL:', data.user.avatar));
```

### 头像 URL 正确但图片不显示

**可能原因：**
- CORS 问题
- 图片 URL 已失效
- WordPress 媒体库权限问题

**解决方法：**
- 检查 WordPress 上传目录权限
- 确认图片 URL 可以直接在浏览器访问
- 检查 CORS 头是否正确设置

## 总结

✅ **问题已解决**：头像现在会持久化显示
✅ **实现方式**：新增 WordPress 端点读取用户 meta
✅ **需要操作**：更新 WordPress 插件
✅ **自动生效**：前端代码已更新

**关键改进：**
- 头像数据从正确的来源读取（WordPress user meta）
- 每次 session 检查都会获取最新头像
- 优先级系统确保总是显示正确的头像
