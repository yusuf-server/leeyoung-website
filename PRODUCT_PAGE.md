# 产品详情页文档

## 📄 文件位置
`/src/pages/products/[slug].astro`

## 🎯 功能特点

### 1. 动态路由
- 使用 Astro 动态路由 `[slug]` 参数
- 根据产品 slug 从 WooCommerce 获取产品数据
- 自动 404 重定向（产品不存在时）

### 2. 页面布局

#### Breadcrumbs（面包屑导航）
- Home > Shop > Category > Product Name
- 带链接，可点击返回
- GSAP 入场动画（stagger）

#### 双列布局（Desktop）
**左列 - 产品图片画廊：**
- 主图展示区
- 缩略图网格（6列自适应）
- 点击缩略图切换主图
- 图片淡入淡出过渡效果
- 促销标签（-X% 折扣）
- FEATURED 标签
- 图片悬停缩放效果
- Sticky 定位（滚动时固定）

**右列 - 产品信息：**
- 产品标题（大标题，粗体，大写）
- 价格显示：
  - 促销价格（红色）+ 原价（删除线）
  - 或常规价格
- 评分和评论数
- 简短描述
- 库存状态（In Stock / Out of Stock）
- 数量选择器（+/- 按钮）
- Add to Cart 按钮（黑色，悬停效果）
- 产品元信息（SKU、分类）

#### 产品描述 Tabs（全宽）
- **Description** - 产品详细描述
- **Additional Info** - 重量、尺寸等
- **Reviews** - 评论（如果有）
- Tab 切换动画
- 内容淡入动画

### 3. 数据来源
- 从 WooCommerce REST API 获取产品数据
- 使用 `getProducts()` 函数获取所有产品
- 根据 slug 过滤找到目标产品
- 支持所有 WooCommerce 产品字段

### 4. GSAP 动画效果

#### 入场动画
- **Breadcrumbs**: 从左滑入，stagger 0.1s
- **Gallery**: 缩放淡入
- **Thumbnails**: 从下滑入，stagger
- **Title**: 从下淡入
- **Price**: 延迟淡入
- **Description**: 延迟淡入

#### 交互动画
- **缩略图点击**: 主图淡出淡入切换
- **数量按钮**: 按钮点击缩放动画
- **Add to Cart**: 按钮点击缩放反弹
- **Tab 切换**: 内容淡入动画
- **图片悬停**: 图片缩放 1.05

### 5. 响应式设计

#### Desktop（>1024px）
- 双列布局（50/50）
- Gallery sticky 定位
- 6 列缩略图网格

#### Tablet（768-1024px）
- 单列布局
- Gallery 非 sticky
- 4 列缩略图网格

#### Mobile（<768px）
- 单列布局
- 数量选择器垂直排列
- Add to Cart 全宽按钮
- 3 列缩略图网格
- Tab 横向滚动

## 🎨 设计风格

### 颜色方案
- **主色**: 黑色 (#000)
- **背景**: 白色 (#fff)
- **次要背景**: 浅灰 (#f8f8f8)
- **促销色**: 红色 (#e74c3c)
- **库存色**: 绿色 (#27ae60)
- **文字**: 深灰 (#333) / 中灰 (#666)

### 字体
- **标题**: Saira Stencil, 大写, 粗体
- **正文**: Saira Stencil, 正常
- **尺寸**: 响应式 clamp()

### 间距
- **Section**: 4rem 上下
- **Container**: 2rem 左右
- **Grid Gap**: 6rem（desktop）/ 3rem（mobile）

## 📱 移动端优化

- 所有元素垂直堆叠
- 缩略图网格自适应
- Tab 横向滚动
- 触摸友好的按钮尺寸
- 全宽 Add to Cart 按钮

## 🔧 待实现功能

### 优先级 1
- [ ] **购物车功能** - 实际添加产品到购物车
- [ ] **产品变体** - 尺寸/颜色选择器
- [ ] **产品评论** - 显示真实评论
- [ ] **相关产品** - 推荐类似产品

### 优先级 2
- [ ] **图片放大** - 点击图片查看大图（Lightbox）
- [ ] **产品分享** - 社交媒体分享按钮
- [ ] **收藏功能** - 添加到愿望清单
- [ ] **产品视频** - 支持视频展示

### 优先级 3
- [ ] **快速结账** - Buy Now 按钮
- [ ] **库存提醒** - 缺货时邮件通知
- [ ] **产品比较** - 与其他产品比较
- [ ] **最近浏览** - 显示最近查看的产品

## 🚀 使用方法

### 访问产品详情页
```
/products/[product-slug]
```

例如：
```
/products/aluminum-pro-cart
/products/heavy-duty-platform
```

### 从 Shop 页面链接
Shop 页面的产品卡片已经链接到详情页：
```html
<a href={`/products/${product.slug}`}>
```

### URL 结构
- Slug 来自 WooCommerce 产品 slug
- 自动转换为小写
- 单词用连字符分隔
- 例如: "Aluminum Pro Cart" → "aluminum-pro-cart"

## 🐛 错误处理

### 产品不存在
- 自动重定向到 `/404`
- 不显示错误信息

### API 错误
- 捕获异常并记录到控制台
- 返回友好错误页面

### 图片加载失败
- 使用 placeholder 图片
- 显示产品名称作为 alt 文本

## 📊 性能优化

### 已实现
- ✅ 图片懒加载（thumbnails）
- ✅ Sticky 定位（gallery）
- ✅ GSAP 动画优化
- ✅ 响应式图片

### 建议
- 使用 CDN 托管产品图片
- 实现图片预加载
- 添加图片压缩
- 使用 WebP 格式

## 🔗 相关文件

- `/src/lib/woocommerce.ts` - WooCommerce API
- `/src/lib/gsap.ts` - GSAP 配置
- `/src/pages/shop.astro` - 产品列表页
- `/src/components/Header.astro` - 导航栏
- `/src/components/Footer.astro` - 页脚

## 💡 技术栈

- **Framework**: Astro (SSG/SSR)
- **Animation**: GSAP
- **API**: WooCommerce REST API
- **Styling**: Scoped CSS
- **TypeScript**: 类型安全

## 📝 注意事项

1. **Slug 必须唯一** - WooCommerce 产品 slug 不能重复
2. **图片优化** - 建议产品图片尺寸为 1200x1200
3. **SEO** - 确保填写产品描述和 meta 信息
4. **库存管理** - 实时同步 WooCommerce 库存
5. **缓存** - 考虑添加 CDN 缓存策略

## 🎬 演示 GIF

（待添加产品详情页截图）

---

**创建日期**: 2026-07-21
**版本**: 1.0.0
**状态**: ✅ 完成并可用
