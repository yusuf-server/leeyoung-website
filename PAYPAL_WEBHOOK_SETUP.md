# PayPal Webhook 配置指南

## 🎯 概述

PayPal Webhook 是确保支付安全的关键组件。即使用户支付后关闭浏览器，webhook 也会通知你的服务器支付状态。

---

## 📋 配置步骤

### 步骤 1：登录 PayPal Developer Dashboard

1. 访问 https://developer.paypal.com/dashboard/
2. 使用你的 PayPal 商家账户登录
3. 切换到 **Sandbox**（测试环境）或 **Live**（生产环境）

### 步骤 2：创建 Webhook

1. 在左侧菜单中，找到 **Apps & Credentials**
2. 切换到对应的环境标签页（Sandbox 或 Live）
3. 滚动到页面底部，找到 **Webhooks** 部分
4. 点击 **Add Webhook** 按钮

### 步骤 3：配置 Webhook URL

**Webhook URL 格式**：
```
https://your-domain.com/api/paypal/webhook
```

**示例**：
- 测试环境：`https://your-site.pages.dev/api/paypal/webhook`
- 生产环境：`https://www.leeyoungshop.com/api/paypal/webhook`

**注意**：
- URL 必须是 HTTPS
- Cloudflare Pages 部署后会自动提供 HTTPS
- 确保 URL 可以公开访问（不要在防火墙后面）

### 步骤 4：订阅事件

在 **Event types** 部分，勾选以下事件：

**必需事件**：
- ✅ `PAYMENT.CAPTURE.COMPLETED` - 支付完成
- ✅ `PAYMENT.CAPTURE.DENIED` - 支付被拒绝
- ✅ `PAYMENT.CAPTURE.REFUNDED` - 支付已退款

**可选事件**（推荐）：
- ⚪ `CHECKOUT.ORDER.APPROVED` - 订单已批准
- ⚪ `PAYMENT.CAPTURE.PENDING` - 支付待处理

### 步骤 5：保存并获取 Webhook ID

1. 点击 **Save** 保存 webhook
2. 创建成功后，你会看到 webhook 列表
3. 点击刚创建的 webhook，查看详细信息
4. **复制 Webhook ID**（格式类似：`1AB23456CD789012E`）

### 步骤 6：配置环境变量

将 Webhook ID 添加到环境变量：

**Cloudflare Pages**：
1. 进入项目设置
2. Settings → Environment variables
3. 添加变量：
   ```
   PAYPAL_WEBHOOK_ID=1AB23456CD789012E
   ```
4. 分别为 Production 和 Preview 环境配置

**本地开发**（`.env` 文件）：
```bash
PAYPAL_WEBHOOK_ID=1AB23456CD789012E
```

---

## 🧪 测试 Webhook

### 方法 1：使用 PayPal 测试工具

1. 在 PayPal Dashboard 的 webhook 详情页面
2. 找到 **Send test webhook** 按钮
3. 选择事件类型：`PAYMENT.CAPTURE.COMPLETED`
4. 点击 **Send Test**
5. 查看响应状态（应该返回 200 OK）

### 方法 2：真实支付测试

1. 使用 sandbox 测试账户
2. 在你的网站上创建测试订单
3. 使用 PayPal sandbox 买家账户支付
4. 检查服务器日志，确认收到 webhook

**PayPal Sandbox 测试账户**：
- 在 PayPal Dashboard → Sandbox → Accounts 创建测试买家和卖家账户
- 买家账户用于测试支付
- 卖家账户用于接收支付

### 方法 3：使用 ngrok（本地开发）

如果需要在本地测试 webhook：

1. 安装 ngrok：https://ngrok.com/
2. 启动本地服务：`npm run dev`
3. 创建隧道：`ngrok http 4321`
4. 复制 ngrok 提供的 HTTPS URL
5. 在 PayPal 中更新 webhook URL 为：`https://xxxx.ngrok.io/api/paypal/webhook`

---

## 🔍 验证 Webhook 是否正常工作

### 检查日志

在服务器日志中查找以下信息：

**成功的 webhook**：
```
📥 收到 PayPal Webhook 事件: PAYMENT.CAPTURE.COMPLETED
✅ PayPal webhook 签名验证成功
✅ 订单状态更新为 processing
```

**失败的 webhook**：
```
❌ Webhook 签名验证失败，拒绝处理
```

### 检查订单状态

1. 登录 WooCommerce 后台
2. 查看订单列表
3. 确认订单状态从 `pending` → `on-hold` → `processing`
4. 检查订单备注中是否有 PayPal 事件记录

---

## ⚠️ 常见问题

### 问题 1：Webhook 返回 401 Unauthorized

**原因**：签名验证失败
**解决方案**：
1. 确认 `PAYPAL_WEBHOOK_ID` 配置正确
2. 确认 webhook URL 与配置的 URL 完全一致
3. 检查是否使用了正确的环境（sandbox vs live）

### 问题 2：Webhook 返回 500 Internal Server Error

**原因**：服务器端代码错误
**解决方案**：
1. 查看 Cloudflare Pages 部署日志
2. 确认所有环境变量都已配置
3. 检查 WooCommerce API 是否可访问

### 问题 3：从未收到 Webhook

**原因**：URL 配置错误或网络问题
**解决方案**：
1. 确认 webhook URL 可以公开访问
2. 使用 `curl` 测试 URL 是否可达
3. 检查 Cloudflare 防火墙设置

### 问题 4：PAYPAL_WEBHOOK_ID 未配置警告

**原因**：开发环境未配置 Webhook ID
**影响**：签名验证被跳过（仅开发环境）
**解决方案**：
- 开发环境：可以忽略，webhook 仍会处理
- 生产环境：**必须配置**，否则不安全

---

## 🔒 安全注意事项

1. **必须配置 PAYPAL_WEBHOOK_ID**
   - 生产环境必须配置，否则任何人都可以伪造 webhook

2. **使用 HTTPS**
   - PayPal 只会向 HTTPS 端点发送 webhook
   - Cloudflare Pages 自动提供 HTTPS

3. **不要在 webhook 中执行耗时操作**
   - PayPal 期望快速响应（< 10 秒）
   - 耗时操作应该放入队列异步处理

4. **监控 Webhook 失败**
   - PayPal 会重试失败的 webhook（最多 3 次）
   - 定期检查 PayPal Dashboard 中的 webhook 活动日志

---

## 📊 Webhook 重试机制

PayPal 的 webhook 重试策略：
- 第 1 次失败：立即重试
- 第 2 次失败：1 小时后重试
- 第 3 次失败：24 小时后重试
- 3 次失败后：停止重试

**建议**：
- 确保服务器稳定性
- 实现幂等性保护（已在代码中实现）
- 定期检查 webhook 活动日志

---

## 📞 需要帮助？

1. **PayPal Developer 文档**：
   - https://developer.paypal.com/docs/api-basics/notifications/webhooks/

2. **查看 Webhook 活动日志**：
   - PayPal Dashboard → Apps & Credentials → Webhooks → 点击 webhook → Activity

3. **联系 PayPal 支持**：
   - https://www.paypal.com/merchantsupport

---

## ✅ 配置完成检查清单

部署前确认：
- [ ] Webhook 已在 PayPal Dashboard 创建
- [ ] Webhook URL 配置正确（HTTPS）
- [ ] 已订阅所有必需事件
- [ ] `PAYPAL_WEBHOOK_ID` 已添加到环境变量
- [ ] 使用 PayPal 测试工具测试 webhook
- [ ] 真实支付测试通过
- [ ] 服务器日志显示签名验证成功
- [ ] 订单状态正确更新

完成这些步骤后，你的 PayPal 支付系统就安全可靠了！🎉
