# WooCommerce 用户认证和评论系统

本文档说明如何使用WooCommerce账户系统进行用户认证和产品评论。

## 功能概述

### 1. 用户认证系统

#### 登录功能
- 用户可以使用WooCommerce账户登录
- 支持用户名或邮箱登录
- Session保持7天
- API端点：`POST /api/auth/login`

#### 注册功能
- 创建新的WooCommerce客户账户
- 必填：用户名、邮箱、密码
- 可选：名字、姓氏
- API端点：`POST /api/auth/register`

#### 登出功能
- 清除用户session
- API端点：`POST /api/auth/logout`

#### Session检查
- 验证用户登录状态
- 获取当前用户信息
- API端点：`GET /api/auth/session`

### 2. 产品评论系统

#### 评论要求
- **必须登录**：只有登录用户才能提交评论
- **必填字段**：评分（1-5星）、评论内容
- **可选**：图片/视频上传（最多5个文件，每个最大10MB）

#### 评论显示
- 显示用户头像（Gravatar）
- 显示用户名
- 显示评分和评论内容
- 显示发布日期
- "Verified Purchase"标签（如果是已购买用户）

#### 评论审核
- 所有评论提交后进入"待审核"状态
- WordPress管理员在后台审核
- 只有已批准的评论才会在前端显示

## 前端组件

### 1. Header组件
位置：`src/components/Header.astro`

功能：
- 显示用户账户按钮
- 未登录：显示默认用户图标，点击打开登录/注册模态框
- 已登录：显示用户头像，点击显示用户菜单
- 登录/注册模态框（切换标签）

### 2. 产品评论组件
位置：`src/pages/products/[slug].astro`

功能：
- 评分概览
- 评论列表
- "Write a Review"按钮（检查登录状态）
- 评论提交表单（带媒体上传）

## API路由

### 认证相关

#### POST /api/auth/login
登录用户

**请求体**：
```json
{
  "username": "用户名或邮箱",
  "password": "密码"
}
```

**响应**：
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "name": "John Doe",
    "avatar": "https://..."
  }
}
```

#### POST /api/auth/register
注册新用户

**请求体**：
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

**响应**：
```json
{
  "success": true,
  "message": "Account created successfully!",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com"
  }
}
```

#### POST /api/auth/logout
登出用户

**响应**：
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/auth/session
检查用户登录状态

**响应**：
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "name": "John Doe",
    "avatar": "https://..."
  }
}
```

### 评论相关

#### POST /api/reviews
提交产品评论（需要登录）

**请求体**：
```json
{
  "product_id": 123,
  "rating": 5,
  "review": "Great product!",
  "media": []
}
```

**响应**：
```json
{
  "success": true,
  "review": {
    "id": 456,
    "product_id": 123,
    "reviewer": "John Doe",
    "rating": 5,
    "review": "Great product!",
    "status": "hold"
  }
}
```

**错误响应**（未登录）：
```json
{
  "error": "You must be logged in to submit a review"
}
```

## WooCommerce后台管理

### 用户管理
1. 进入 **用户 > 所有用户**
2. 查看所有注册用户
3. 可以编辑用户信息、角色权限

### 客户管理
1. 进入 **WooCommerce > 客户**
2. 查看所有WooCommerce客户
3. 查看订单历史、购买记录

### 评论管理
1. 进入 **产品 > 评论**
2. 查看所有产品评论（待审核、已批准、垃圾评论）
3. 可以：
   - 批准/拒绝评论
   - 编辑评论内容
   - 标记为垃圾评论
   - 回复评论
   - 查看评论者信息

### 评论设置
1. 进入 **设置 > 讨论**
2. 配置：
   - 评论是否需要审核
   - 评论者是否必须填写姓名和邮箱
   - 评论排序方式

## 安全特性

### 1. Session管理
- 使用HTTP-only cookies存储session
- 生产环境使用secure cookies
- Session有效期：7天
- 自动验证session有效性

### 2. API密钥保护
- WooCommerce密钥存储在环境变量中
- 不暴露给客户端
- 所有API调用在服务器端进行

### 3. 输入验证
- 前端和后端双重验证
- 邮箱格式验证
- 密码长度验证（最少6位）
- 评分范围验证（1-5）
- 文件大小和类型验证

### 4. XSS防护
- WooCommerce自动转义HTML
- 评论内容自动清理

## 用户流程

### 注册和登录流程
1. 用户点击Header的用户图标
2. 打开登录/注册模态框
3. 选择"Register"标签
4. 填写注册信息并提交
5. 账户创建成功，切换到登录标签
6. 使用新账户登录
7. 登录成功，页面刷新，显示用户头像

### 评论流程
1. 用户浏览产品详情页
2. 滚动到"Product Reviews"区块
3. 点击"Write a Review"按钮
4. 系统检查登录状态
   - 未登录：提示登录并打开登录模态框
   - 已登录：打开评论表单
5. 填写评分、评论内容
6. 可选：上传图片/视频
7. 点击"Submit Review"
8. 评论提交成功，等待管理员审核
9. 审核通过后，评论显示在产品页面

## 待开发功能

### 媒体上传（TODO）
目前媒体上传功能的前端UI已完成，但需要实现：

1. **WordPress媒体上传API集成**
   - 使用WordPress REST API上传文件
   - 将媒体ID关联到评论

2. **评论元数据存储**
   - 使用WooCommerce评论meta存储媒体ID
   - 在前端显示评论时加载媒体

3. **实现步骤**：
```typescript
// 1. 创建媒体上传API
// POST /api/upload-media
// 上传文件到WordPress媒体库

// 2. 获取媒体ID并关联到评论
// 使用WooCommerce API添加评论meta

// 3. 在评论显示时加载媒体
// 从评论meta获取媒体ID并显示
```

### 用户菜单（TODO）
完整的用户下拉菜单，包括：
- 我的账户
- 订单历史
- 地址管理
- 登出

### 已购买验证（TODO）
- 检查用户是否购买过该产品
- 只有已购买用户才能评论
- 显示"Verified Purchase"标签

## 环境变量配置

确保`.env`文件包含以下变量：

```
WOOCOMMERCE_URL=https://your-wordpress-site.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxx
```

## 故障排查

### 登录失败
- 检查用户名/密码是否正确
- 确认WooCommerce URL配置正确
- 查看浏览器控制台错误信息

### 评论提交失败
- 确认用户已登录
- 检查session是否有效
- 确认WooCommerce API密钥正确

### Session丢失
- 检查cookie设置
- 确认域名配置正确
- 生产环境需要HTTPS

## 技术栈

- **前端**: Astro, TypeScript
- **后端**: Astro API Routes
- **认证**: Cookie-based sessions
- **数据存储**: WooCommerce/WordPress数据库
- **API**: WooCommerce REST API v3
