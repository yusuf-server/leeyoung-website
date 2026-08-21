# PayPal 支付安全性分析报告

## 📊 当前实现概览

### 支付流程
```
1. 用户提交订单 → create-order.ts
2. 创建 WooCommerce 订单（pending）
3. 创建 PayPal 订单
4. 用户在 PayPal 完成支付
5. 前端调用 capture-order.ts 捕获支付
6. 更新 WooCommerce 订单为 processing
7. （可选）PayPal Webhook 确认支付
```

---

## 🔴 安全风险分析

### 1. **前端发起的 Capture 请求（高风险）**

**问题**：
- 当前实现依赖前端调用 `capture-order.ts` 来完成支付
- 用户支付完成后，从 PayPal 返回到你的网站，前端 JavaScript 调用 capture API
- 如果用户关闭浏览器或网络中断，capture 不会执行
- 恶意用户可能在未支付的情况下伪造 capture 请求

**代码位置**：`src/pages/api/paypal/capture-order.ts`

```typescript
// 当前流程：前端调用这个 API
export const POST: APIRoute = async ({ request, locals }) => {
  const { paypalOrderId, orderId } = await request.json();
  // 直接捕获支付，没有验证用户是否真的支付了
  const captureResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`, ...);
}
```

**风险等级**：⭐⭐⭐⭐⭐ (5/5)

---

### 2. **缺少 Webhook 签名验证（高风险）**

**问题**：
- 当前 webhook 实现没有验证 PayPal 签名
- 任何人都可以伪造 webhook 请求到你的服务器
- 恶意用户可以发送假的 "PAYMENT.CAPTURE.COMPLETED" 事件

**代码位置**：`src/pages/api/paypal/webhook.ts`

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  const payload = await request.json();
  // ❌ 没有验证签名！
  const eventType = payload.event_type;

  switch (eventType) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      // 直接更新订单状态，没有验证这个请求是否真的来自 PayPal
      await fetch(`${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`, {
        body: JSON.stringify({ status: 'processing', set_paid: true })
      });
    }
  }
}
```

**风险等级**：⭐⭐⭐⭐⭐ (5/5)

---

### 3. **订单状态更新时机问题（中风险）**

**问题**：
- `capture-order.ts` 在捕获成功后立即设置 `set_paid: true`
- 如果 PayPal 后续退款或争议，你的系统不会自动更新
- Webhook 是备用机制，但当前实现中两者都会更新订单

**风险等级**：⭐⭐⭐ (3/5)

---

### 4. **缺少幂等性保护（中风险）**

**问题**：
- 同一个 PayPal 订单可能被多次捕获（如果用户多次点击按钮）
- Webhook 和前端 capture 可能重复处理
- 没有检查订单是否已经被支付

**风险等级**：⭐⭐⭐ (3/5)

---

## ✅ 当前实现的优点

1. ✅ **使用服务端 API**：支付密钥在服务端，不暴露给前端
2. ✅ **WooCommerce 订单关联**：正确关联了 WooCommerce 订单
3. ✅ **已实现 Webhook**：有 webhook 端点，只是缺少签名验证
4. ✅ **环境隔离**：支持 sandbox 和 live 模式切换

---

## 🚨 生产环境部署风险评估

### 如果直接使用生产密钥上线：

| 风险场景 | 可能性 | 影响 | 风险等级 |
|---------|--------|------|---------|
| 恶意用户伪造 capture 请求获取免费订单 | 高 | 严重 | 🔴 危险 |
| 恶意用户伪造 webhook 激活未支付订单 | 高 | 严重 | 🔴 危险 |
| 用户支付后网络中断导致订单未激活 | 中 | 中等 | 🟡 警告 |
| PayPal 退款但订单未更新 | 低 | 中等 | 🟡 警告 |
| 重复支付捕获 | 低 | 低 | 🟢 可接受 |

**总体评估**：🔴 **不建议直接上线生产环境**

---

## 🛡️ 推荐的安全改进方案

### 方案 1：最小化改进（推荐，2-3 小时）

#### 改进 1：添加 Webhook 签名验证

```typescript
// webhook.ts 顶部添加验证函数
async function verifyWebhookSignature(
  webhookId: string,
  event: any,
  headers: Headers,
  webhookUrl: string
): Promise<boolean> {
  const PAYPAL_CLIENT_ID = import.meta.env.PAYPAL_CLIENT_ID;
  const PAYPAL_CLIENT_SECRET = import.meta.env.PAYPAL_CLIENT_SECRET;
  const PAYPAL_API_URL = import.meta.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  // 获取 access token
  const authResponse = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  const authData = await authResponse.json();

  // 验证签名
  const verifyResponse = await fetch(
    `${PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify({
        transmission_id: headers.get('paypal-transmission-id'),
        transmission_time: headers.get('paypal-transmission-time'),
        cert_url: headers.get('paypal-cert-url'),
        auth_algo: headers.get('paypal-auth-algo'),
        transmission_sig: headers.get('paypal-transmission-sig'),
        webhook_id: webhookId,
        webhook_event: event,
      }),
    }
  );

  const verifyData = await verifyResponse.json();
  return verifyData.verification_status === 'SUCCESS';
}

// 在 webhook handler 中使用
export const POST: APIRoute = async ({ request, locals }) => {
  const payload = await request.json();

  // ✅ 验证签名
  const isValid = await verifyWebhookSignature(
    env.PAYPAL_WEBHOOK_ID, // 需要添加这个环境变量
    payload,
    request.headers,
    'https://your-site.com/api/paypal/webhook'
  );

  if (!isValid) {
    console.error('❌ Webhook 签名验证失败');
    return new Response('Invalid signature', { status: 401 });
  }

  // 继续处理...
}
```

**新增环境变量**：
```bash
PAYPAL_WEBHOOK_ID=xxxxx  # 从 PayPal Dashboard 获取
```

#### 改进 2：添加幂等性检查

```typescript
// capture-order.ts 改进
export const POST: APIRoute = async ({ request, locals }) => {
  const { paypalOrderId, orderId } = await request.json();

  // ✅ 检查订单是否已支付
  const orderResponse = await fetch(
    `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
    {
      headers: { 'Authorization': `Basic ${wcAuth}` }
    }
  );

  const order = await orderResponse.json();

  if (order.status === 'processing' || order.status === 'completed') {
    console.log('⚠️ 订单已支付，跳过捕获');
    return new Response(
      JSON.stringify({ success: true, message: 'Order already paid' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 继续捕获...
}
```

#### 改进 3：仅依赖 Webhook 更新订单（可选但推荐）

移除 `capture-order.ts` 中的 `set_paid: true`，仅在 webhook 中设置：

```typescript
// capture-order.ts - 仅捕获支付，不更新订单状态
body: JSON.stringify({
  status: 'on-hold', // 等待 webhook 确认
  meta_data: [
    { key: '_paypal_capture_id', value: captureData.id },
    { key: '_paypal_capture_pending', value: 'yes' }
  ]
}),
```

---

### 方案 2：完整安全方案（推荐用于高流量，4-6 小时）

在方案 1 基础上增加：

1. **数据库日志记录**（防止重复处理）
   - 记录所有 webhook 事件到数据库
   - 检查 transaction_id 是否已处理

2. **订单状态机**
   - pending → on-hold → processing → completed
   - 严格的状态转换规则

3. **异步处理队列**
   - Webhook 立即返回 200
   - 使用 Cloudflare Queues 异步处理订单更新

4. **监控和告警**
   - 记录所有失败的 webhook 验证
   - 监控未完成的订单

---

## 📝 建议的部署策略

### 阶段 1：测试环境验证（1-2 天）
1. 实施方案 1 的改进
2. 在 sandbox 环境充分测试
3. 测试场景：
   - ✅ 正常支付流程
   - ✅ 用户支付后关闭浏览器
   - ✅ Webhook 失败重试
   - ✅ 重复点击支付按钮
   - ✅ 伪造 webhook 请求（应该被拒绝）

### 阶段 2：灰度上线（3-7 天）
1. 切换到生产环境密钥
2. 小流量测试（限制每日订单量）
3. 每日检查订单状态
4. 监控 webhook 成功率

### 阶段 3：全量上线
1. 移除流量限制
2. 持续监控 7 天
3. 准备回滚方案

---

## 🎯 最终建议

### 立即可以做的（上线前必须）：
1. ✅ **添加 Webhook 签名验证**（必须）
2. ✅ **添加订单状态幂等性检查**（必须）
3. ✅ 在 PayPal Dashboard 配置 Webhook URL
4. ✅ 添加 `PAYPAL_WEBHOOK_ID` 环境变量

### 短期优化（上线后 2 周内）：
1. 🟡 移除前端 capture，完全依赖 webhook
2. 🟡 添加订单状态监控
3. 🟡 实现订单状态自动修复脚本

### 长期优化（1-3 个月）：
1. 🟢 实施完整的异步处理队列
2. 🟢 添加退款 webhook 处理
3. 🟢 实现财务对账系统

---

## ⚠️ 当前状态总结

**可以上线吗？**
- ❌ **不建议**直接使用当前代码
- ✅ **必须先实施**方案 1 的改进
- ⏱️ **预计改进时间**：2-3 小时

**如果一定要立即上线：**
- 🔴 接受可能被恶意攻击的风险
- 🟡 手动监控每个订单
- 🟡 准备人工审核可疑订单
- 🟡 每日对账 PayPal 和 WooCommerce 订单

**推荐做法：**
花 2-3 小时实施方案 1，大幅降低风险，然后再上线。
