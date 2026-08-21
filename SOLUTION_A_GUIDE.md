# 🎯 方案A完整指南 - 使用WooCommerce原生Checkout

## 📋 架构说明

```
前端（你的设计）          WooCommerce（原生功能）
─────────────────────────────────────────────────

浏览商品
添加到购物车 ──────→      WooCommerce购物车API
查看购物车                存储在服务器端

点击Checkout ──────→      /checkout页面（原生）
                         ├─ 显示购物车商品
                         ├─ 填写地址
                         ├─ 选择支付方式
                         ├─ 完成支付
                         └─ 发送邮件

支付成功 ←──────────      跳转回前端成功页面
```

---

## ✅ 已完成的部分

### 后端API（保留）：
1. ✅ `/src/pages/api/cart/index.ts` - 购物车管理
2. ✅ `/src/lib/woo-cart.ts` - Cart Manager
3. ✅ `/src/pages/checkout-redirect.astro` - 跳转到WooCommerce

### WordPress配置文件：
1. ✅ `wordpress-checkout-customization.php` - 美化WooCommerce Checkout

---

## 🔧 需要你做的配置

### 第一步：WordPress配置

#### 1. 添加自定义代码

将 `wordpress-checkout-customization.php` 的代码添加到WordPress：

**推荐方法：创建自定义插件**

```
1. SSH或FTP连接到WordPress服务器
2. 进入目录：wp-content/plugins/
3. 创建文件夹：headless-checkout
4. 创建文件：wp-content/plugins/headless-checkout/headless-checkout.php
```

文件内容：
```php
<?php
/**
 * Plugin Name: Headless Checkout Customization
 * Description: 自定义WooCommerce Checkout页面，支持无头前端
 * Version: 1.0
 * Author: Your Name
 */

// 粘贴 wordpress-checkout-customization.php 的全部内容到这里

```

5. 在WordPress后台 → 插件 → 激活 "Headless Checkout Customization"

#### 2. 修改域名配置

在插件代码中找到并修改：

```php
// Line 10-15: 允许的前端域名
$allowed_origins = [
    'https://your-frontend.pages.dev',      // ← 改成你的Cloudflare Pages域名
    'http://localhost:4321',                 // 开发环境
];

// Line 264: 支付成功后跳转的前端URL
$frontend_url = 'https://your-frontend.pages.dev/checkout/success?order_id=' . $order_id;
//               ↑ 改成你的前端域名
```

#### 3. 配置Stripe支付

```
WordPress后台 → 插件 → 安装插件
搜索: "WooCommerce Stripe Payment Gateway"
安装并激活

WooCommerce → Settings → Payments → Stripe
✅ Enable Stripe
✅ Enable Inline Credit Card Form （重要！这是嵌入式）
添加API密钥
保存
```

---

### 第二步：前端配置

#### 1. 环境变量

创建 `.env` 文件：
```env
WOOCOMMERCE_URL=https://your-wordpress-site.com
WORDPRESS_GRAPHQL_URL=https://your-wordpress-site.com/graphql
```

#### 2. 修改购物车页面的Checkout按钮

找到你的购物车页面（可能是 `/src/pages/cart.astro`），修改Checkout按钮：

**当前可能是：**
```html
<a href="/checkout">Proceed to Checkout</a>
```

**改成：**
```html
<a href="/checkout-redirect">Proceed to Checkout</a>
```

或者直接链接到WooCommerce：
```astro
---
const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
---
<a href={`${WOOCOMMERCE_URL}/checkout`}>Proceed to Checkout</a>
```

#### 3. 修改产品页的"Add to Cart"功能

确保产品页面调用WooCommerce API添加商品，而不是localStorage。

**检查产品详情页** (`/src/pages/products/[slug].astro`)：

找到"Add to Cart"按钮的逻辑，确保它调用：
```javascript
await WooCartManager.addItem(productId, quantity);
```

而不是：
```javascript
CartManager.addItem(...); // 旧的localStorage方式
```

---

### 第三步：部署到Cloudflare

#### 1. 安装Cloudflare adapter

```bash
npm install @astrojs/cloudflare
```

#### 2. 修改 `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory'
  }),
});
```

#### 3. 部署

```bash
npm run build
npx wrangler pages deploy dist
```

在Cloudflare Pages设置中添加环境变量：
- `WOOCOMMERCE_URL`
- `WORDPRESS_GRAPHQL_URL`

---

## 🎨 美化WooCommerce Checkout页面

WooCommerce Checkout页面的样式已经在 `wordpress-checkout-customization.php` 中配置好了。

### 默认样式包括：

✅ 黑白配色（匹配你的前端）
✅ 现代化卡片设计
✅ Stripe Elements嵌入式表单
✅ 响应式布局
✅ 优雅的按钮和表单

### 如果想进一步匹配你的前端样式：

在 `wordpress-checkout-customization.php` 中找到CSS部分，修改：

```css
/* 主色调 */
#place_order {
    background: #000;  /* 改成你的品牌色 */
}

/* 字体 */
body.woocommerce-checkout {
    font-family: 'Inter', sans-serif;  /* 改成你前端的字体 */
}

/* 输入框样式 */
.woocommerce input[type="text"],
.woocommerce input[type="email"] {
    border: 1px solid #e5e5e5;  /* 匹配你的前端 */
    border-radius: 6px;
}
```

---

## 🧪 测试流程

### 1. 测试添加到购物车

```
1. 访问产品页面
2. 点击"Add to Cart"
3. 打开浏览器开发者工具 → Network
4. 应该看到 POST /api/cart 请求
5. 购物车图标数量应该更新
```

### 2. 测试Checkout流程

```
1. 访问购物车页面
2. 点击"Proceed to Checkout"
3. 应该跳转到 WooCommerce Checkout页面
4. 购物车商品应该显示
5. 填写地址信息
6. 选择Stripe支付
7. 输入测试卡号：4242 4242 4242 4242
8. 完成支付
9. 应该跳转回你的前端成功页面
10. 检查邮箱收到订单确认邮件
```

### 3. 检查WooCommerce后台

```
WooCommerce → Orders
应该看到新订单，状态为"Processing"
```

---

## 📊 完整流程图

```
用户在前端浏览商品
    ↓
点击"Add to Cart"
    ↓
调用 POST /api/cart
    ↓
WooCommerce创建服务器端购物车（Cookie会话）
    ↓
购物车图标更新
    ↓
用户访问购物车页面
    ↓
点击"Proceed to Checkout"
    ↓
跳转到 WooCommerce /checkout页面
    ↓
【美化的WooCommerce页面，样式和前端一致】
    ↓
显示购物车商品（自动获取）
    ↓
用户填写地址、选择支付方式
    ↓
输入支付信息（Stripe Elements嵌入）
    ↓
完成支付
    ↓
WooCommerce发送邮件
    ↓
跳转回前端 /checkout/success?order_id=xxx
    ↓
✅ 完成！
```

---

## 🎯 关键优势

✅ **简单** - 前端只负责展示和添加购物车
✅ **可靠** - WooCommerce处理所有支付和订单逻辑
✅ **灵活** - 在WooCommerce后台添加任何支付方式
✅ **统一** - 美化后的Checkout页面看起来和前端一样
✅ **低维护** - 不需要维护复杂的支付集成代码

---

## 🔍 常见问题

**Q: 购物车数据会丢失吗？**
A: 不会，数据存在WooCommerce服务器端，通过Cookie会话管理

**Q: 用户必须跳转到WooCommerce吗？**
A: 是的，但跳转的页面可以美化得和前端一模一样

**Q: 支持多少种支付方式？**
A: 所有WooCommerce支持的支付方式（Stripe、PayPal、Apple Pay等）

**Q: 邮件怎么发送？**
A: WooCommerce自动发送，在后台配置邮件模板

**Q: 可以自定义WooCommerce页面吗？**
A: 可以，通过CSS完全自定义，或者修改WooCommerce模板

---

## 📝 下一步

1. ✅ 配置WordPress（添加插件代码）
2. ✅ 配置Stripe支付网关
3. ✅ 修改前端Checkout按钮
4. ✅ 测试完整流程
5. ✅ 美化WooCommerce Checkout样式
6. ✅ 部署到Cloudflare

完成后，你就有一个完整的电商网站了！🎉
