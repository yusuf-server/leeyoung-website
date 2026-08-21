# 像素追踪配置指南

## 概述

网站已经集成了主流广告平台的像素追踪系统，支持：
- **Meta Pixel** (Facebook/Instagram 广告)
- **Google Ads** (Google 广告转化追踪)
- **Google Analytics 4** (GA4 网站分析)
- **TikTok Pixel** (TikTok 广告)
- **Pinterest Tag** (Pinterest 广告)
- **自定义脚本** (其他追踪代码)

---

## 快速配置

### 步骤 1：获取像素 ID

从各个平台获取你的追踪 ID：

#### Meta Pixel (Facebook)
1. 访问 [Facebook Events Manager](https://business.facebook.com/events_manager/)
2. 选择你的像素
3. 复制 **Pixel ID**（16位数字）

#### Google Analytics 4
1. 访问 [Google Analytics](https://analytics.google.com/)
2. 管理 > 数据流 > 选择你的网站
3. 复制 **测量 ID**（格式：`G-XXXXXXXXXX`）

#### Google Ads
1. 访问 [Google Ads](https://ads.google.com/)
2. 工具与设置 > 转化
3. 复制 **转化 ID**（格式：`AW-123456789`）

#### TikTok Pixel
1. 访问 [TikTok Ads Manager](https://ads.tiktok.com/)
2. 资产 > 事件
3. 复制 **Pixel ID**

#### Pinterest Tag
1. 访问 [Pinterest Ads](https://ads.pinterest.com/)
2. 广告 > 转化
3. 复制 **Tag ID**

---

### 步骤 2：配置像素 ID

打开文件：`src/config/pixels.ts`

```typescript
export const pixelConfig = {
  // Meta Pixel (Facebook/Instagram)
  meta: {
    enabled: true,  // 改为 true 启用
    pixelId: '1234567890123456',  // 填入你的 Pixel ID
    advancedMatching: true
  },

  // Google Analytics 4
  googleAnalytics: {
    enabled: true,  // 改为 true 启用
    measurementId: 'G-XXXXXXXXXX'  // 填入你的测量 ID
  },

  // Google Ads
  googleAds: {
    enabled: true,  // 改为 true 启用
    conversionId: 'AW-123456789',  // 填入你的转化 ID
    conversionLabels: {
      purchase: 'AbCDeFgHiJ',      // 购买转化标签
      signUp: 'KlMNoPqRsT',        // 注册转化标签
      addToCart: 'UvWXyZaBcD'      // 加入购物车标签
    }
  },

  // TikTok Pixel
  tiktok: {
    enabled: true,  // 改为 true 启用
    pixelId: 'XXXXXXXXXXXXXX'  // 填入你的 Pixel ID
  },

  // Pinterest Tag
  pinterest: {
    enabled: true,  // 改为 true 启用
    tagId: '1234567890123'  // 填入你的 Tag ID
  },

  // 自定义脚本
  custom: {
    enabled: false,
    headScripts: '',  // 自定义 <head> 脚本
    bodyScripts: ''   // 自定义 <body> 脚本
  }
};
```

---

### 步骤 3：测试像素

保存配置后，访问网站并打开浏览器开发者工具（F12）：

1. **检查脚本加载**
   - 打开 Network 标签
   - 刷新页面
   - 搜索 `fbevents.js`、`gtag/js`、`analytics.tiktok.com` 等
   - 确认脚本成功加载

2. **使用浏览器插件验证**
   - Meta Pixel: 安装 [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/)
   - Google: 安装 [Google Tag Assistant](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/)
   - 访问网站，查看插件图标确认像素正常工作

3. **在平台查看实时数据**
   - Meta: Events Manager > Test Events
   - Google Analytics: 实时报告
   - Google Ads: 转化 > 摘要

---

## 使用追踪事件

### 自动追踪

以下事件会自动追踪：
- ✅ **PageView** - 页面浏览（所有页面）

### 手动追踪

在代码中手动触发追踪事件：

#### 示例 1：商品详情页

```typescript
import { pixelEvents } from '../lib/pixels';

// 当用户查看商品详情
pixelEvents.viewItem({
  item_id: '12345',
  item_name: 'Product Name',
  price: 99.99,
  category: 'Electronics'
});
```

#### 示例 2：加入购物车

```typescript
import { pixelEvents } from '../lib/pixels';

// 当用户点击"加入购物车"
pixelEvents.addToCart({
  content_id: '12345',
  content_name: 'Product Name',
  value: 99.99,
  currency: 'USD'
});
```

#### 示例 3：购买完成

```typescript
import { pixelEvents } from '../lib/pixels';

// 订单支付成功后
pixelEvents.purchase({
  transaction_id: 'ORDER-123',
  value: 299.99,
  currency: 'USD',
  contents: [
    { id: '12345', quantity: 1, price: 99.99 },
    { id: '67890', quantity: 2, price: 100.00 }
  ]
});
```

#### 示例 4：用户注册

```typescript
import { pixelEvents } from '../lib/pixels';

// 用户注册成功后
pixelEvents.completeRegistration({
  value: 0,
  currency: 'USD'
});
```

---

## 在 Astro 页面中使用

### 方法 1：在客户端脚本中

```astro
---
// src/pages/product/[slug].astro
---

<Layout title="Product Page">
  <div class="product-details">
    <!-- 产品内容 -->
  </div>

  <script>
    import { pixelEvents } from '../../lib/pixels';

    // 页面加载时追踪查看商品
    pixelEvents.viewItem({
      item_id: '12345',
      item_name: 'Product Name',
      price: 99.99
    });

    // 点击"加入购物车"按钮
    document.querySelector('.add-to-cart-btn')?.addEventListener('click', () => {
      pixelEvents.addToCart({
        content_id: '12345',
        content_name: 'Product Name',
        value: 99.99
      });
    });
  </script>
</Layout>
```

### 方法 2：在组件事件中

```tsx
// 在 React/Preact 组件中
import { pixelEvents } from '../lib/pixels';

function AddToCartButton({ product }) {
  const handleClick = () => {
    // 追踪事件
    pixelEvents.addToCart({
      content_id: product.id,
      content_name: product.name,
      value: product.price
    });

    // 执行加入购物车逻辑
    addToCart(product);
  };

  return <button onClick={handleClick}>Add to Cart</button>;
}
```

---

## 可用的追踪事件

完整的事件列表（定义在 `src/lib/pixels.ts`）：

| 事件方法 | 用途 | 参数 |
|---------|------|------|
| `viewContent()` | 查看内容 | `{ content_name, content_category, value }` |
| `search()` | 搜索 | `searchTerm` |
| `addToCart()` | 加入购物车 | `{ content_name, content_id, value, currency }` |
| `initiateCheckout()` | 开始结账 | `{ value, currency, num_items }` |
| `purchase()` | 购买完成 | `{ value, currency, transaction_id, contents }` |
| `completeRegistration()` | 注册完成 | `{ value, currency }` |
| `viewItem()` | 查看商品 | `{ item_id, item_name, price, category }` |

---

## Google Ads 转化标签配置

### 获取转化标签

1. Google Ads > 工具与设置 > 转化
2. 创建新转化操作（例如"购买"）
3. 选择"网站"类型
4. 完成设置后，复制**转化标签**（类似 `AbCDeFgHiJ`）

### 配置转化标签

```typescript
// src/config/pixels.ts
googleAds: {
  enabled: true,
  conversionId: 'AW-123456789',
  conversionLabels: {
    purchase: 'AbCDeFgHiJ',      // 购买转化标签
    signUp: 'KlMNoPqRsT',        // 注册转化标签
    addToCart: 'UvWXyZaBcD'      // 加入购物车标签（可选）
  }
}
```

转化标签会在对应事件触发时自动发送到 Google Ads。

---

## 自定义脚本配置

如果需要添加其他追踪代码（如第三方分析工具）：

```typescript
// src/config/pixels.ts
custom: {
  enabled: true,
  headScripts: `
    <!-- 在 <head> 中插入的脚本 -->
    <script>
      console.log('Custom tracking initialized');
    </script>
  `,
  bodyScripts: `
    <!-- 在 <body> 开始处插入的脚本 -->
    <script>
      // 自定义追踪代码
    </script>
  `
}
```

---

## 常见问题

### Q1: 像素追踪不工作？

**检查清单：**
1. ✅ `enabled` 设置为 `true`
2. ✅ Pixel ID 填写正确，没有多余空格
3. ✅ 浏览器没有安装广告拦截器
4. ✅ 浏览器开发者工具 Network 中能看到追踪脚本加载
5. ✅ 使用浏览器插件验证（Facebook Pixel Helper、Google Tag Assistant）

### Q2: 如何测试像素？

**Meta Pixel 测试：**
1. Events Manager > Test Events
2. 输入你的网站 URL
3. 在新窗口浏览网站，查看实时事件

**Google Analytics 测试：**
1. Google Analytics > 实时 > 概览
2. 访问网站，查看实时用户数

**Google Ads 测试：**
1. Google Ads > 转化 > 摘要
2. 查看"最近的转化"（可能需要等待几分钟）

### Q3: 开发环境要不要启用追踪？

**建议：**
- 开发环境（localhost）：**禁用**追踪，避免污染数据
- 生产环境：**启用**追踪

**方法：根据环境动态配置**

```typescript
// src/config/pixels.ts
const isDevelopment = import.meta.env.DEV;

export const pixelConfig = {
  meta: {
    enabled: !isDevelopment,  // 仅生产环境启用
    pixelId: '1234567890123456'
  }
  // ...其他配置
};
```

### Q4: 如何追踪多个 Google Ads 账户？

如果需要同时追踪多个 Google Ads 账户，需要在 `PixelScripts.astro` 中添加多个 gtag 配置：

```astro
<script is:inline>
  gtag('config', 'AW-123456789');  // 账户 1
  gtag('config', 'AW-987654321');  // 账户 2
</script>
```

### Q5: 像素会影响网站速度吗？

**影响很小：**
- 所有追踪脚本都是异步加载（`async`）
- 不会阻塞页面渲染
- 现代追踪脚本都经过优化

**最佳实践：**
- 只启用需要的平台
- 定期检查是否还在使用这些平台

---

## 隐私和合规

### GDPR / Cookie 同意

如果你的网站面向欧盟用户，需要：

1. **添加 Cookie 同意横幅**
2. **只在用户同意后启用追踪**

示例实现（需要额外开发）：

```typescript
// 检查用户是否同意 Cookie
if (localStorage.getItem('cookie_consent') === 'true') {
  pixelEvents.viewContent({ ... });
}
```

推荐使用 Cookie 同意插件：
- [Cookiebot](https://www.cookiebot.com/)
- [OneTrust](https://www.onetrust.com/)

### 隐私政策

确保你的隐私政策中说明：
- ✅ 使用了哪些追踪技术
- ✅ 收集了哪些数据
- ✅ 数据如何使用
- ✅ 用户如何选择退出

---

## 总结

### 配置步骤
1. ✅ 从各平台获取 Pixel ID
2. ✅ 在 `src/config/pixels.ts` 中配置
3. ✅ 使用浏览器插件验证
4. ✅ 在关键页面添加事件追踪
5. ✅ 在平台查看数据

### 关键文件
- **配置文件**: `src/config/pixels.ts`
- **组件**: `src/components/PixelScripts.astro`
- **工具函数**: `src/lib/pixels.ts`
- **使用位置**: 所有使用 `Layout.astro` 或 `BaseLayout.astro` 的页面

### 需要帮助？
- Meta Pixel: [Facebook for Developers](https://developers.facebook.com/docs/meta-pixel)
- Google Analytics: [GA4 Documentation](https://support.google.com/analytics/)
- Google Ads: [Google Ads Help](https://support.google.com/google-ads/)

---

**最后更新：** 2026-08-21
