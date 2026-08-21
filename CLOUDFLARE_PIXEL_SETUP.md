# Cloudflare 部署后配置像素追踪

## 方案 1：使用环境变量（推荐）⭐

这样你可以在 Cloudflare 后台随时修改像素 ID，**无需重新部署代码**。

---

## 在 Cloudflare Pages 配置环境变量

### 步骤 1：登录 Cloudflare Dashboard

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的项目
3. 进入 **Pages** > 选择你的网站项目

### 步骤 2：添加环境变量

1. 点击 **Settings（设置）**
2. 找到 **Environment variables（环境变量）**
3. 点击 **Add variable（添加变量）**

### 步骤 3：配置像素 ID

根据需要添加以下环境变量：

#### Meta Pixel (Facebook/Instagram)
```
变量名: PUBLIC_META_PIXEL_ID
值: 1234567890123456
```

#### Google Analytics 4
```
变量名: PUBLIC_GA4_MEASUREMENT_ID
值: G-XXXXXXXXXX
```

#### Google Ads
```
变量名: PUBLIC_GOOGLE_ADS_ID
值: AW-123456789

# 可选：转化标签
变量名: PUBLIC_GOOGLE_ADS_PURCHASE_LABEL
值: AbCDeFgHiJ

变量名: PUBLIC_GOOGLE_ADS_SIGNUP_LABEL
值: KlMNoPqRsT

变量名: PUBLIC_GOOGLE_ADS_ADDCART_LABEL
值: UvWXyZaBcD
```

#### TikTok Pixel
```
变量名: PUBLIC_TIKTOK_PIXEL_ID
值: XXXXXXXXXXXXXX
```

#### Pinterest Tag
```
变量名: PUBLIC_PINTEREST_TAG_ID
值: 1234567890123
```

#### 自定义脚本（可选）
```
变量名: PUBLIC_CUSTOM_TRACKING_ENABLED
值: true

变量名: PUBLIC_CUSTOM_HEAD_SCRIPTS
值: <script>你的自定义代码</script>
```

### 步骤 4：选择环境

为每个变量选择应用的环境：
- ✅ **Production（生产环境）** - 必选
- ⬜ Preview（预览环境）- 可选
- ⬜ Development（开发环境）- 建议不选

### 步骤 5：重新部署

⚠️ **重要**：添加环境变量后，需要**重新部署一次**才能生效。

方法：
1. 在 Cloudflare Pages 项目中，找到 **Deployments（部署）**
2. 点击最新部署右侧的 **...** 按钮
3. 选择 **Retry deployment（重试部署）**

或者：
- 推送新的 commit 到 Git 仓库，触发自动部署

---

## 配置示例截图说明

### Cloudflare Pages 环境变量界面

```
Environment variables for Production

┌──────────────────────────────────────┬─────────────────────┐
│ Variable name                        │ Value               │
├──────────────────────────────────────┼─────────────────────┤
│ PUBLIC_META_PIXEL_ID                 │ 1234567890123456    │
│ PUBLIC_GA4_MEASUREMENT_ID            │ G-ABC123XYZ         │
│ PUBLIC_GOOGLE_ADS_ID                 │ AW-123456789        │
│ PUBLIC_GOOGLE_ADS_PURCHASE_LABEL     │ AbCDeFgHiJ          │
│ PUBLIC_TIKTOK_PIXEL_ID               │ C1A2B3C4D5E6        │
└──────────────────────────────────────┴─────────────────────┘

[+ Add variable]
```

---

## 方案 2：直接修改配置文件（备选）

如果你不想用环境变量，可以直接在代码中填写，但**每次修改都需要重新部署**。

### 修改 `src/config/pixels.ts`

```typescript
export const pixelConfig = {
  meta: {
    enabled: true,
    pixelId: '1234567890123456',  // 直接填写
    advancedMatching: true
  },
  googleAnalytics: {
    enabled: true,
    measurementId: 'G-XXXXXXXXXX'  // 直接填写
  }
  // ...
};
```

### 部署流程

1. 修改 `src/config/pixels.ts`
2. `git add .`
3. `git commit -m "Update pixel IDs"`
4. `git push`
5. Cloudflare Pages 自动重新部署

---

## 验证配置

### 1. 检查环境变量是否生效

在浏览器访问你的网站，打开开发者工具（F12），在 Console 中输入：

```javascript
// 检查 Meta Pixel
console.log(window.fbq ? 'Meta Pixel loaded ✓' : 'Meta Pixel not found ✗');

// 检查 Google Analytics
console.log(window.gtag ? 'Google Analytics loaded ✓' : 'Google Analytics not found ✗');

// 检查 TikTok Pixel
console.log(window.ttq ? 'TikTok Pixel loaded ✓' : 'TikTok Pixel not found ✗');
```

### 2. 使用浏览器插件

- **Meta Pixel**: 安装 [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/)
- **Google**: 安装 [Google Tag Assistant](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/)

### 3. 在平台查看实时数据

- **Meta**: Events Manager > Test Events
- **Google Analytics**: 实时报告
- **Google Ads**: 转化 > 摘要

---

## 常见问题

### Q1: 环境变量配置后不生效？

**解决方案：**
1. ✅ 确认变量名正确（区分大小写）
2. ✅ 确认选择了 Production 环境
3. ✅ **必须重新部署一次**（Retry deployment）
4. ✅ 清除浏览器缓存，刷新页面

### Q2: 如何修改像素 ID？

**使用环境变量：**
1. Cloudflare Dashboard > Pages > 你的项目
2. Settings > Environment variables
3. 点击变量右侧的 **Edit（编辑）**
4. 修改值
5. **重新部署**（Retry deployment）

**使用配置文件：**
1. 修改 `src/config/pixels.ts`
2. Git commit + push
3. 自动重新部署

### Q3: 生产环境和开发环境可以用不同的像素吗？

**可以！** 在 Cloudflare 环境变量中分别配置：

- **Production** - 使用真实的像素 ID
- **Preview** - 使用测试的像素 ID（如果有）
- **Development** - 不配置（本地开发不追踪）

### Q4: 怎么临时禁用某个像素？

**方法 1**：删除对应的环境变量
- Cloudflare Dashboard > Environment variables
- 找到对应变量，点击删除
- 重新部署

**方法 2**：将值改为空字符串
- 编辑环境变量，值留空
- 重新部署

### Q5: 环境变量安全吗？

**注意：**
- ✅ 像素 ID 是公开的（可以在网页源代码中看到）
- ✅ 使用 `PUBLIC_` 前缀的变量会暴露在客户端
- ⚠️ **不要**在环境变量中存储敏感信息（API 密钥、密码等）

对于真正敏感的数据（如 WooCommerce API 密钥），使用不带 `PUBLIC_` 前缀的变量：
```
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx  // 服务器端，不会暴露
PUBLIC_META_PIXEL_ID=123456        // 客户端，公开可见
```

---

## 推荐工作流程

### 初次部署
1. ✅ 先部署网站到 Cloudflare（不配置像素）
2. ✅ 测试网站功能是否正常
3. ✅ 从各平台获取像素 ID
4. ✅ 在 Cloudflare 配置环境变量
5. ✅ 重新部署
6. ✅ 使用浏览器插件验证像素

### 日常维护
- 需要添加新平台：在 Cloudflare 添加环境变量 → 重新部署
- 需要修改像素 ID：编辑环境变量 → 重新部署
- 需要临时禁用：删除环境变量 → 重新部署

### 开发测试
- 本地开发不配置像素（避免污染数据）
- 或使用测试像素 ID（在 `.env` 文件中）

---

## 本地开发配置（可选）

如果想在本地测试像素追踪，创建 `.env` 文件：

```bash
# .env（不要提交到 Git）
PUBLIC_META_PIXEL_ID=你的测试Pixel ID
PUBLIC_GA4_MEASUREMENT_ID=G-TESTXXXXXX
```

**.gitignore** 中确保包含：
```
.env
.env.local
```

---

## 总结

### 推荐方案：环境变量

**优点：**
- ✅ 修改像素 ID 无需改代码
- ✅ 不同环境可以用不同配置
- ✅ 更安全（配置分离）
- ✅ 符合最佳实践

**缺点：**
- ⚠️ 每次修改需要重新部署（但不需要改代码）

### 备选方案：配置文件

**优点：**
- ✅ 配置集中在代码中
- ✅ 适合配置很少变动的情况

**缺点：**
- ❌ 每次修改都要改代码、commit、push
- ❌ 配置暴露在 Git 历史中

---

**最后更新：** 2026-08-21
