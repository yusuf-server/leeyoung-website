# 环境变量配置清单

## Cloudflare Pages 部署所需的环境变量

### 🔴 必需配置（核心功能）

#### 1. WooCommerce API（必需）
```
WOOCOMMERCE_URL=https://your-wordpress-site.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
**说明**：用于连接 WordPress/WooCommerce 获取产品、订单等数据
**获取方式**：WordPress 后台 → WooCommerce → 设置 → 高级 → REST API → 添加密钥


#### 2. WordPress API（必需）
```
WORDPRESS_URL=https://your-wordpress-site.com
```
**说明**：用于博客功能（REST API）
**注意**：与 WOOCOMMERCE_URL 相同


### 🟡 支付功能（如果启用支付）

#### 3. Stripe（信用卡支付）
```
# 生产环境
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 测试环境
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
**说明**：用于信用卡支付处理
**获取方式**：https://dashboard.stripe.com/apikeys
**Webhook 配置**：需要在 Stripe 后台添加 webhook 端点：`https://your-site.com/api/stripe/webhook`


#### 4. PayPal（PayPal 支付）
```
# 生产环境
PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_MODE=live
PAYPAL_WEBHOOK_ID=xxxxxxxxxxxxxxxxxxxxx

# 测试环境（sandbox）
PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=xxxxxxxxxxxxxxxxxxxxx
```
**说明**：用于 PayPal 支付处理
**获取方式**：https://developer.paypal.com/dashboard/
**Webhook ID 获取**：PayPal Dashboard → Apps & Credentials → Webhooks → 创建 webhook → 查看 Webhook ID
**Webhook 配置**：需要在 PayPal 后台添加 webhook URL：`https://your-site.com/api/paypal/webhook`
**订阅事件**：PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.REFUNDED


### 🟢 追踪像素（可选，用于广告转化追踪）

#### 5. Meta/Facebook Pixel
```
PUBLIC_META_PIXEL_ID=your_pixel_id
```
**说明**：Facebook/Instagram 广告转化追踪
**获取方式**：Facebook Events Manager


#### 6. Google Analytics 4
```
PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```
**说明**：网站流量分析
**获取方式**：Google Analytics 后台


#### 7. Google Ads
```
PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX
PUBLIC_GOOGLE_ADS_PURCHASE_LABEL=xxxxx
PUBLIC_GOOGLE_ADS_SIGNUP_LABEL=xxxxx
PUBLIC_GOOGLE_ADS_ADDCART_LABEL=xxxxx
```
**说明**：Google Ads 转化追踪
**获取方式**：Google Ads 后台


#### 8. TikTok Pixel
```
PUBLIC_TIKTOK_PIXEL_ID=your_pixel_id
```
**说明**：TikTok 广告转化追踪
**获取方式**：TikTok Events Manager


#### 9. Pinterest Tag
```
PUBLIC_PINTEREST_TAG_ID=your_tag_id
```
**说明**：Pinterest 广告转化追踪
**获取方式**：Pinterest Ads Manager


#### 10. 自定义追踪脚本（可选）
```
PUBLIC_CUSTOM_TRACKING_ENABLED=true
PUBLIC_CUSTOM_HEAD_SCRIPTS=<script>...</script>
PUBLIC_CUSTOM_BODY_SCRIPTS=<script>...</script>
```
**说明**：自定义的第三方追踪代码


---

## 📋 在 Cloudflare Pages 中配置

### 方法 1：通过 Cloudflare Dashboard
1. 登录 Cloudflare Pages
2. 选择你的项目
3. 进入 **Settings** → **Environment variables**
4. 分别为 **Production** 和 **Preview** 环境添加变量
5. 注意：`PUBLIC_` 开头的变量会被暴露到前端，其他变量仅在服务端使用

### 方法 2：通过 wrangler.toml（不推荐存储敏感信息）
```toml
[env.production.vars]
WOOCOMMERCE_URL = "https://your-site.com"
# 不要在这里存储密钥！
```

---

## 🔒 安全建议

1. **不要提交 `.env` 文件到 Git**
   - 已添加到 `.gitignore`
   - 仅在本地开发使用

2. **敏感信息仅存储在 Cloudflare**
   - API 密钥
   - Webhook 密钥
   - 支付密钥

3. **使用生产环境密钥**
   - 部署到 Cloudflare 时使用 `live` 模式
   - 本地开发使用 `test/sandbox` 模式

4. **区分 PUBLIC 和私有变量**
   - `PUBLIC_` 开头：可被前端访问（如 Stripe 公钥）
   - 无前缀：仅服务端使用（如 Stripe 私钥）

---

## ✅ 最小配置（仅展示产品，不支付）

如果暂时不启用支付功能，只需配置：

```
WOOCOMMERCE_URL=https://your-wordpress-site.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxx
WORDPRESS_URL=https://your-wordpress-site.com
```

其他追踪像素可以后续逐步添加。

---

## 🧪 测试配置是否正确

部署后测试：
- ✅ 首页能显示产品
- ✅ 产品详情页能打开
- ✅ 购物车功能正常
- ✅ 博客页面能加载文章
- ✅ 用户登录/注册功能
- ✅ 如启用支付：测试订单流程

---

## 📞 需要帮助？

如果配置过程中遇到问题：
1. 检查 Cloudflare Pages 的部署日志
2. 确认所有必需的环境变量都已设置
3. 确认 WooCommerce API 密钥有正确的权限（读/写）
4. 测试 WordPress REST API 是否可访问
