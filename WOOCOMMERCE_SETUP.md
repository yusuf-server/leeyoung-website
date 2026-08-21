# WooCommerce 集成配置指南

## 1. WordPress 后台配置

### 安装必要插件
确保你的 WordPress 已安装以下插件：
- **WooCommerce** - 电商核心插件
- **WPGraphQL** - GraphQL API（已配置）
- **WooCommerce REST API** - 已内置在 WooCommerce 中

### 生成 WooCommerce API 密钥

1. 登录 WordPress 后台
2. 进入 **WooCommerce > 设置 > 高级 > REST API**
3. 点击 **添加密钥** 或 **Add Key**
4. 填写信息：
   - **描述**: `Astro Frontend`
   - **用户**: 选择管理员账户
   - **权限**: 选择 **读取** 或 **读/写**（如果需要购物车功能选择读/写）
5. 点击 **生成 API 密钥**
6. 复制显示的 **Consumer Key** 和 **Consumer Secret**（只显示一次，请保存好）

## 2. 环境变量配置

将 `.env.example` 复制为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
# WordPress GraphQL 端点
WORDPRESS_GRAPHQL_URL=https://your-site.com/graphql

# WooCommerce REST API
WOOCOMMERCE_URL=https://your-site.com
WOOCOMMERCE_CONSUMER_KEY=ck_your_consumer_key_here
WOOCOMMERCE_CONSUMER_SECRET=cs_your_consumer_secret_here
```

⚠️ **注意**：
- `WOOCOMMERCE_URL` 不需要包含 `/wp-json/wc/v3`，代码会自动添加
- 密钥区分大小写，请完整复制
- `.env` 文件已在 `.gitignore` 中，不会被提交到代码库

## 3. WooCommerce 产品设置

### 产品分类
在 WordPress 后台创建产品分类：
- 进入 **产品 > 分类**
- 创建分类，例如：
  - Utility Carts
  - Platform Trucks
  - Folding Carts
  - Warehouse Trolleys

### 产品属性
为筛选功能创建产品属性：
1. 进入 **产品 > 属性**
2. 创建属性：
   - **Capacity** (容量): 200 lbs, 400 lbs, 600 lbs, 1000 lbs
   - **Material** (材质): Aluminum, Steel, Plastic

### 产品配置
创建产品时，确保填写：
- ✅ 产品名称
- ✅ 价格（常规价格 + 促销价格）
- ✅ 产品图片（至少一张）
- ✅ 产品分类
- ✅ 产品属性
- ✅ 库存状态
- ✅ 简短描述（显示在产品卡片）
- ✅ 详细描述
- ✅ SKU（可选）

### 特色产品设置
- 在产品编辑页面勾选 **特色产品** 复选框
- 特色产品会显示 "FEATURED" 标签

### 促销产品设置
- 设置 **促销价格** 会自动显示 "SALE" 标签和折扣百分比

## 4. 功能说明

### 已实现的功能

#### Shop 页面功能
- ✅ 从 WooCommerce 获取产品列表
- ✅ 产品分类筛选
- ✅ 价格区间筛选
- ✅ 排序功能（价格、名称、最新）
- ✅ 产品卡片显示：
  - 产品图片
  - 产品名称
  - 价格（常规价格/促销价格）
  - 评分（如果有）
  - FEATURED/SALE 标签
  - 折扣百分比
- ✅ 响应式设计（桌面3列，平板2列，手机2列）
- ✅ 移动端筛选 Drawer
- ✅ GSAP 动画效果

#### API 端点
- `/api/products` - 获取产品列表（支持分页和筛选）
- `/api/categories` - 获取产品分类

### 客户端筛选逻辑
点击筛选按钮后，会：
1. 更新筛选参数
2. 调用 `/api/products` API
3. 动态渲染产品列表
4. 应用 GSAP 入场动画

## 5. 测试

### 测试 API 连接
在浏览器访问：
```
http://localhost:4321/api/products
http://localhost:4321/api/categories
```

应该返回 JSON 格式的产品和分类数据。

### 测试页面
访问：
```
http://localhost:4321/shop
```

应该显示：
- Hero Banner
- 筛选侧边栏（桌面端）或筛选按钮（移动端）
- 产品网格
- 分页导航

## 6. 下一步开发

### 待实现功能
- [ ] 产品详情页 (`/products/[slug]`)
- [ ] 购物车功能
- [ ] 结账流程
- [ ] 用户账户
- [ ] 订单追踪
- [ ] 搜索功能
- [ ] 产品快速查看（Quick View）
- [ ] 愿望清单
- [ ] 产品比较

### 推荐的开发顺序
1. **产品详情页** - 显示完整产品信息
2. **购物车** - LocalStorage 或 Session 存储
3. **结账** - 集成 WooCommerce Checkout API
4. **用户认证** - JWT 或 Session

## 7. 故障排除

### 问题：API 返回 401 错误
**解决方案**：
- 检查 Consumer Key 和 Secret 是否正确
- 确认 API 权限设置为"读取"或"读/写"
- 检查 WordPress 用户是否有管理员权限

### 问题：图片不显示
**解决方案**：
- 确认产品已上传图片
- 检查图片 URL 是否可访问
- 检查 WordPress 媒体库权限

### 问题：分类不显示
**解决方案**：
- 确认已创建产品分类
- 确认产品已分配到分类
- 检查分类是否有产品

### 问题：价格为 0
**解决方案**：
- 确认产品已设置价格
- 检查 WooCommerce 货币设置
- 确认产品类型为"简单产品"

## 8. 安全建议

⚠️ **重要安全提示**：

1. **不要提交 `.env` 文件**到代码库
2. **使用只读权限**的 API 密钥（如果只需要展示产品）
3. **定期更换** API 密钥
4. **启用 HTTPS** 确保数据传输安全
5. **使用环境变量**存储所有敏感信息

## 9. 性能优化

### 建议
- 使用 CDN 托管产品图片
- 启用 WordPress 缓存插件
- 设置合理的 `per_page` 参数（推荐 12-24）
- 使用图片懒加载
- 考虑使用 Redis 或 Memcached 缓存 API 响应

## 10. 支持

如有问题，请检查：
- WooCommerce 官方文档: https://woocommerce.com/documentation/
- WooCommerce REST API 文档: https://woocommerce.github.io/woocommerce-rest-api-docs/
- Astro 文档: https://docs.astro.build/
