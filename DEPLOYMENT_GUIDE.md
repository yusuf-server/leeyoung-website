# 🚀 生产级部署指南

## 📋 重构完成清单

### ✅ 已创建的文件
1. `src/lib/env.ts` - 环境变量适配层
2. `src/lib/stripe-client.ts` - Stripe SDK 初始化（兼容 Cloudflare）
3. `src/pages/api/stripe/create-order-and-intent.ts` - 创建订单和 PaymentIntent
4. `src/pages/api/stripe/webhook.ts` - Webhook 签名验证与订单更新
5. `astro.config.mjs` - 添加 Cloudflare 适配器
6. `.env.example` - 环境变量模板

---

## 🔧 安装依赖

```bash
npm install @astrojs/cloudflare@^11.1.1
```

---

## ⚙️ 本地开发配置

### 1. 更新 .env 文件

在你的 `.env` 文件中添加 Stripe Webhook Secret：

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. 配置 Stripe Webhook（本地测试）

使用 Stripe CLI 转发 Webhook 到本地：

```bash
# 安装 Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# 登录
stripe login

# 转发 Webhook 到本地
stripe listen --forward-to http://localhost:4321/api/stripe/webhook
```

Stripe CLI 会输出 Webhook 签名密钥，复制到 `.env` 文件中。

### 3. 触发测试事件

```bash
# 模拟支付成功
stripe trigger payment_intent.succeeded

# 模拟支付失败
stripe trigger payment_intent.payment_failed
```

---

## 🌐 部署到 Cloudflare Pages

### 1. 推送代码到 Git 仓库

```bash
git add .
git commit -m "refactor: 生产级 Stripe 支付重构（Webhook + Cloudflare 兼容）"
git push origin main
```

### 2. 在 Cloudflare Pages 创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** → **Create a project**
3. 连接你的 Git 仓库
4. 构建配置：
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

### 3. 配置环境变量

在 Cloudflare Pages 项目设置中添加环境变量：

**Settings → Environment Variables → Production**

```
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
WOOCOMMERCE_URL=https://your-site.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxx
```

⚠️ **注意**：确保使用生产环境的 Stripe 密钥！

### 4. 配置 Stripe 生产环境 Webhook

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 进入 **Developers → Webhooks**
3. 点击 **Add endpoint**
4. 填写 Webhook 地址：
   ```
   https://your-cloudflare-pages-domain.pages.dev/api/stripe/webhook
   ```
5. 选择监听事件：
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
6. 复制 **Signing secret**（`whsec_xxx`），填入 Cloudflare Pages 环境变量

---

## 🧪 测试流程

### 1. 本地测试

```bash
# 启动开发服务器
npm run dev

# 另一个终端启动 Stripe CLI
stripe listen --forward-to http://localhost:4321/api/stripe/webhook
```

访问 `http://localhost:4321` 进行完整购买流程测试。

### 2. 生产环境测试

使用 Stripe 测试卡号：
- **成功**: `4242 4242 4242 4242`
- **需要 3D Secure**: `4000 0025 0000 3155`
- **失败**: `4000 0000 0000 9995`

---

## 🔒 安全检查清单

- ✅ 所有 API 路由使用 `btoa()` 而非 `Buffer`
- ✅ Stripe SDK 使用 `createFetchHttpClient()`
- ✅ Webhook 使用 `request.text()` 获取 Raw Body
- ✅ Webhook 使用 `constructEventAsync` 验证签名
- ✅ PaymentIntent 在 metadata 中绑定 order_id
- ✅ 订单先创建为 pending，Webhook 更新为 processing
- ✅ 幂等性检查：已处理的订单不重复更新
- ✅ 环境变量从 Cloudflare runtime 读取

---

## 📊 架构对比

### ❌ 旧架构（不安全）
```
前端 → create-payment-intent → 支付 → confirm-payment → 创建订单
```
**问题**: 前端可伪造、用户关闭浏览器会漏单

### ✅ 新架构（生产级）
```
前端 → create-order-and-intent (创建 pending 订单 + PaymentIntent)
         ↓
       支付
         ↓
  Webhook (验证签名) → 更新订单为 processing
```
**优势**:
- 防伪造（签名验证）
- 零漏单（订单已创建）
- 幂等性（重复 Webhook 不影响）

---

## 🆘 常见问题

### Q1: Webhook 返回 401 Invalid signature
**原因**: Webhook Secret 配置错误或请求体被修改
**解决**:
1. 检查 `.env` 中的 `STRIPE_WEBHOOK_SECRET`
2. 确保没有中间件修改请求体
3. 使用 `request.text()` 而非 `request.json()`

### Q2: 部署后报错 "Buffer is not defined"
**原因**: 代码中仍使用了 Node.js 的 `Buffer`
**解决**: 全局搜索 `Buffer.from`，替换为 `btoa()`

### Q3: Webhook 没有触发
**原因**:
1. Webhook URL 配置错误
2. Stripe Dashboard 中未添加端点
3. 网络防火墙阻止

**解决**:
1. 检查 Stripe Dashboard → Webhooks 配置
2. 查看 Webhook 日志确认请求状态
3. 使用 Stripe CLI 本地测试

---

## 📞 技术支持

如有问题，请检查：
1. Cloudflare Pages 部署日志
2. Stripe Dashboard → Webhooks → 查看失败请求
3. WooCommerce → 订单列表 → 检查订单状态

---

**重构完成！现在你的系统已完全兼容 Cloudflare Pages 并具备生产级安全性。** 🎉
