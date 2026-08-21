# PayPal 支付集成指南

本项目已集成 PayPal 支付功能，作为 Stripe 的补充支付方式。两种支付方式可以通过配置文件轻松切换。

## 📋 功能概述

- ✅ PayPal 标准支付流程
- ✅ 自动创建 WooCommerce 订单
- ✅ 支持访客结账和自动账户创建
- ✅ Webhook 自动更新订单状态
- ✅ 与 Stripe 共存，可独立启用/禁用
- ✅ 支持 Sandbox（测试）和 Live（生产）环境

## 🔧 配置步骤

### 1. 获取 PayPal API 凭证

#### Sandbox（测试环境）

1. 访问 [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. 登录你的 PayPal 开发者账户
3. 进入 **Apps & Credentials**
4. 在 **Sandbox** 标签下，点击 **Create App**
5. 创建应用后，复制：
   - **Client ID**（用于前端和后端）
   - **Secret**（仅用于后端）

#### Live（生产环境）

1. 同样在 **Apps & Credentials** 页面
2. 切换到 **Live** 标签
3. 点击 **Create App**
4. 复制生产环境的 **Client ID** 和 **Secret**

### 2. 配置环境变量

在 `.env` 文件中添加：

```bash
# PayPal Sandbox（测试环境）
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_secret
PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_MODE=sandbox

# 生产环境使用：
# PAYPAL_CLIENT_ID=your_live_client_id
# PAYPAL_CLIENT_SECRET=your_live_secret
# PUBLIC_PAYPAL_CLIENT_ID=your_live_client_id
# PAYPAL_MODE=live
```

**注意：**
- `PUBLIC_PAYPAL_CLIENT_ID` 会暴露在前端，用于加载 PayPal SDK
- `PAYPAL_CLIENT_SECRET` 仅在后端使用，不会暴露
- `PAYPAL_MODE` 决定使用 sandbox 还是 live 环境

### 3. 配置 Cloudflare Pages 环境变量

如果部署到 Cloudflare Pages：

1. 进入 Cloudflare Dashboard → Pages → 你的项目 → Settings → Environment variables
2. 添加以下变量：
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PUBLIC_PAYPAL_CLIENT_ID`
   - `PAYPAL_MODE`

### 4. 启用/禁用支付方式

在 `src/config/payment.ts` 中配置：

```typescript
export const PAYMENT_CONFIG = {
  stripe: {
    enabled: false, // 🔴 Stripe 暂时禁用
    name: 'Credit Card',
    description: 'Pay securely with your credit card',
    icon: '💳',
  },
  paypal: {
    enabled: true, // 🟢 PayPal 启用
    name: 'PayPal',
    description: 'Pay securely with your PayPal account',
    icon: '🅿️',
  },
};
```

### 5. 配置 Webhook（推荐）

Webhook 用于自动更新订单状态（支付成功/失败）。

#### 本地测试（使用 ngrok）

```bash
# 安装 ngrok
brew install ngrok  # macOS
# 或从 https://ngrok.com/download 下载

# 启动本地服务器
npm run dev

# 在另一个终端启动 ngrok
ngrok http 4321

# 复制 ngrok 提供的 HTTPS URL，例如：
# https://xxxx-xx-xx-xx-xx.ngrok-free.app
```

#### 在 PayPal 中配置 Webhook

1. 进入 [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. 点击左侧菜单 **Apps & Credentials**
3. 选择你的应用
4. 滚动到 **Webhooks** 部分，点击 **Add Webhook**
5. Webhook URL 设置为：
   - 本地测试：`https://xxxx.ngrok-free.app/api/paypal/webhook`
   - 生产环境：`https://yourdomain.com/api/paypal/webhook`
6. 选择以下事件类型：
   - `PAYMENT.CAPTURE.COMPLETED` - 支付完成
   - `PAYMENT.CAPTURE.DENIED` - 支付拒绝
   - `CHECKOUT.ORDER.APPROVED` - 订单批准（可选）
7. 保存 Webhook

## 📁 文件结构

```
src/
├── config/
│   └── payment.ts                        # 支付方式配置（启用/禁用）
├── pages/
│   ├── checkout.astro                    # 结账页面（支持 Stripe + PayPal）
│   └── api/
│       ├── paypal/
│       │   ├── create-order.ts           # 创建 PayPal 订单
│       │   ├── capture-order.ts          # 捕获 PayPal 支付
│       │   └── webhook.ts                # PayPal Webhook 处理
│       └── stripe/
│           ├── create-order-and-intent.ts # Stripe 订单创建
│           └── webhook.ts                 # Stripe Webhook 处理
```

## 🔄 支付流程

### PayPal 支付流程

1. **用户填写信息** → 选择 PayPal 支付
2. **前端调用** `/api/paypal/create-order`
   - 创建 WooCommerce 订单（pending 状态）
   - 创建 PayPal 订单
   - 返回 PayPal 订单 ID
3. **PayPal SDK** 打开支付窗口
4. **用户完成支付** → PayPal 调用 `onApprove` 回调
5. **前端调用** `/api/paypal/capture-order`
   - 向 PayPal 发送捕获请求
   - 更新 WooCommerce 订单状态为 completed
6. **跳转到成功页面**

### Webhook 自动更新（可选但推荐）

- `PAYMENT.CAPTURE.COMPLETED` → 订单状态更新为 `completed`
- `PAYMENT.CAPTURE.DENIED` → 订单状态更新为 `failed`

## 🧪 测试

### Sandbox 测试账户

PayPal 提供测试买家和卖家账户：

1. 进入 [Sandbox Accounts](https://developer.paypal.com/dashboard/accounts)
2. 使用 **Personal Account**（买家）进行测试
3. 默认密码通常是 `12345678`，或点击账户查看详情

### 测试流程

1. 在 `.env` 中设置 `PAYPAL_MODE=sandbox`
2. 启动项目：`npm run dev`
3. 访问 `/checkout`
4. 选择 PayPal 支付
5. 使用 Sandbox 测试账户登录并完成支付
6. 检查 WooCommerce 后台订单状态

## 🔐 安全注意事项

1. **永远不要** 在前端代码中暴露 `PAYPAL_CLIENT_SECRET`
2. **只有** `PUBLIC_PAYPAL_CLIENT_ID` 可以在前端使用
3. 生产环境使用 `PAYPAL_MODE=live` 和 Live API 凭证
4. Webhook 接收到的数据应该验证签名（当前实现可以增强）
5. 订单金额由后端计算，前端传递的金额仅作参考

## 🎯 切换支付方式

### 仅启用 PayPal（禁用 Stripe）

```typescript
// src/config/payment.ts
export const PAYMENT_CONFIG = {
  stripe: { enabled: false },
  paypal: { enabled: true },
};
```

### 同时启用两种支付方式

```typescript
// src/config/payment.ts
export const PAYMENT_CONFIG = {
  stripe: { enabled: true },
  paypal: { enabled: true },
};
```

用户可以在结账页面选择使用哪种支付方式。

### 仅启用 Stripe（禁用 PayPal）

```typescript
// src/config/payment.ts
export const PAYMENT_CONFIG = {
  stripe: { enabled: true },
  paypal: { enabled: false },
};
```

## 🚀 部署到生产环境

1. **更新环境变量**：使用 Live API 凭证
2. **配置 Webhook**：使用生产域名
3. **设置 PAYPAL_MODE=live**
4. **测试支付流程**：使用真实 PayPal 账户小额测试
5. **监控订单**：检查 WooCommerce 后台订单状态是否正确更新

## 🐛 常见问题

### PayPal 按钮不显示

- 检查 `PUBLIC_PAYPAL_CLIENT_ID` 是否正确配置
- 检查浏览器控制台是否有 JavaScript 错误
- 确认 `src/config/payment.ts` 中 `paypal.enabled` 为 `true`

### 支付完成但订单状态未更新

- 检查 Webhook 是否正确配置
- 查看服务器日志：`/api/paypal/webhook` 是否收到请求
- 手动调用 `/api/paypal/capture-order` 更新订单

### Sandbox 支付失败

- 确认使用的是 Sandbox 测试账户
- 检查 `PAYPAL_MODE=sandbox`
- 验证 Sandbox Client ID 和 Secret 是否正确

## 📞 支持

如有问题，请查看：
- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Checkout Integration](https://developer.paypal.com/docs/checkout/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
