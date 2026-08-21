# WooCommerce Headless 集成说明

## 📋 概述

你的网站现在使用 **WooCommerce Store API** 进行完全的无头(headless)集成。这意味着：

✅ 前端保持你的自定义设计和样式
✅ 购物车由WooCommerce服务器管理（不用localStorage）
✅ 支付完全由WooCommerce和支付网关插件处理
✅ 自动触发WooCommerce的邮件通知
✅ 支持所有WooCommerce支付方式（Stripe、PayPal等）

---

## 🔧 WooCommerce 配置要求

### 1. 启用 WooCommerce Store API

WooCommerce Store API 从 WooCommerce 4.0+ 开始内置，但需要确认已启用。

**检查方法：**
访问: `https://your-wordpress-site.com/wp-json/wc/store/v1/`

如果返回API端点列表，说明已启用。

### 2. 配置CORS（跨域请求）

由于前端和WordPress在不同域名，需要配置CORS。

**在WordPress主题的 `functions.php` 或自定义插件中添加：**

```php
// Allow CORS for WooCommerce Store API
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $origin = get_http_origin();
        $allowed_origins = [
            'https://your-frontend-domain.com',
            'http://localhost:4321', // 开发环境
        ];

        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, Cart-Token, X-WC-Store-API-Nonce');
        }

        if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
            status_header(200);
            exit();
        }

        return $value;
    });
}, 15);

// Enable Store API Cart session
add_filter('woocommerce_store_api_disable_nonce_check', '__return_true');
```

### 3. 安装并配置支付网关

**推荐插件：**

#### Stripe
```
插件名: WooCommerce Stripe Payment Gateway
下载: WordPress后台 → Plugins → Add New → 搜索 "WooCommerce Stripe"

配置:
1. WooCommerce → Settings → Payments → Stripe
2. 启用 Stripe
3. 添加 API Keys (Test/Live)
4. 启用 "Inline Credit Card Form" (这就是嵌入式!)
```

#### PayPal
```
插件名: WooCommerce PayPal Payments
下载: WordPress后台 → Plugins → Add New → 搜索 "PayPal"

配置:
1. WooCommerce → Settings → Payments → PayPal
2. 连接PayPal账户
3. 配置支付流程
```

### 4. 配置邮件通知

```
WooCommerce → Settings → Emails
- 确保所有邮件模板已启用
- 配置发件人信息
- 推荐安装: WP Mail SMTP 插件
```

---

## 🔄 工作流程

### 购物车流程
```
用户添加商品
    ↓
调用 POST /api/cart
    ↓
WooCommerce Store API 创建/更新服务器端购物车
    ↓
返回购物车数据（包含商品、价格、税费等）
    ↓
前端显示购物车
```

### 结账流程
```
用户访问 /checkout
    ↓
前端获取 WooCommerce 支付方式列表
    ↓
用户填写地址和选择支付方式
    ↓
提交订单 → POST /api/checkout/create-order
    ↓
调用 WooCommerce Store API 创建订单
    ↓
WooCommerce 根据支付方式：
├─ Stripe (嵌入式): 返回支付页面URL，页面包含Stripe Elements
├─ PayPal: 返回PayPal支付URL
└─ 其他: 返回相应的支付流程
    ↓
用户完成支付
    ↓
WooCommerce 更新订单状态
    ↓
触发邮件通知
    ↓
跳转回前端成功页面
```

---

## 📁 文件变更说明

### 新增文件：

1. `/src/pages/api/cart/index.ts`
   - 处理购物车操作（GET, POST, PUT, DELETE）
   - 使用 WooCommerce Store API

2. `/src/pages/api/cart/checkout.ts`
   - 获取checkout数据（支付方式、配送方式等）

3. `/src/lib/woo-cart.ts`
   - 新的Cart Manager，替代localStorage方案
   - 提供异步API调用方法

### 修改的文件：

1. `/src/pages/api/checkout/create-order.ts`
   - 改用 WooCommerce Store API 创建订单
   - 不再使用 REST API v3

2. `/src/pages/api/checkout/payment-gateways.ts`
   - 改用 Store API 获取支付方式
   - 返回当前购物车可用的支付方式

---

## 🚀 部署到Cloudflare

### 1. 安装 Cloudflare Adapter

```bash
npm install @astrojs/cloudflare
```

### 2. 修改 `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory' // 或 'advanced'
  }),
});
```

### 3. 设置环境变量

在 Cloudflare Pages 设置中添加：

```
WOOCOMMERCE_URL=https://your-wordpress-site.com
WORDPRESS_GRAPHQL_URL=https://your-wordpress-site.com/graphql
```

**注意：** Store API 不需要 Consumer Key/Secret！

### 4. 部署

```bash
npm run build
npx wrangler pages deploy dist
```

---

## ✅ 优势

### 相比之前的方案：

| 功能 | 之前 (REST API v3) | 现在 (Store API) |
|------|-------------------|------------------|
| 购物车 | localStorage | WooCommerce服务器 |
| 会话管理 | 手动cookie | WooCommerce自动管理 |
| 支付集成 | 需要自己处理 | WooCommerce插件处理 |
| 税费计算 | 手动计算 | WooCommerce自动计算 |
| 优惠券 | 需要自己实现 | 原生支持 |
| 配送方式 | 需要自己实现 | 原生支持 |
| API密钥 | 需要暴露 | 不需要（更安全）|

---

## 🧪 测试清单

- [ ] 添加商品到购物车
- [ ] 更新购物车数量
- [ ] 删除购物车商品
- [ ] 访问checkout页面
- [ ] 看到正确的支付方式列表
- [ ] 提交订单
- [ ] 跳转到WooCommerce支付页面
- [ ] 完成支付
- [ ] 收到订单确认邮件
- [ ] 订单在WooCommerce后台显示

---

## 🔍 调试

### 检查购物车会话

浏览器开发者工具 → Application → Cookies → 查找 `wc_cart_hash`

### 检查API响应

```bash
# 获取购物车
curl https://your-wordpress-site.com/wp-json/wc/store/v1/cart

# 获取checkout数据
curl https://your-wordpress-site.com/wp-json/wc/store/v1/checkout
```

---

## 📞 常见问题

**Q: Stripe表单在哪里显示？**
A: 当用户选择Stripe并提交订单后，会跳转到WooCommerce的支付页面，那里会显示Stripe Elements嵌入式表单。

**Q: 需要配置Stripe webhook吗？**
A: 需要！在Stripe Dashboard配置webhook指向你的WordPress网站：
`https://your-wordpress-site.com/wc-api/WC_Gateway_Stripe`

**Q: 支持多货币吗？**
A: 支持！安装WooCommerce多货币插件即可。

**Q: 能自定义WooCommerce支付页面样式吗？**
A: 可以！在WordPress主题中自定义WooCommerce模板即可。

---

## 🎯 下一步

现在你的前端已经完全对接WooCommerce Store API。你只需要：

1. 在WordPress配置CORS
2. 配置支付网关（Stripe/PayPal）
3. 测试完整流程
4. 部署到Cloudflare

前端代码已经准备好了！
