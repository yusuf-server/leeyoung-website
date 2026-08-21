# 🚀 Cloudflare Pages 部署指南

## ✅ 准备工作（已完成）

- ✅ Cloudflare adapter 已配置（`@astrojs/cloudflare`）
- ✅ 构建脚本已更新
- ✅ `.gitignore` 已配置（排除 `.env` 文件）
- ✅ 本地构建测试通过

---

## 📋 部署步骤

### 第一步：推送代码到 Git 仓库

#### 1.1 初始化 Git（如果还没有）

```bash
git init
git add .
git commit -m "feat: 准备部署到 Cloudflare Pages"
```

#### 1.2 连接到远程仓库

**GitHub:**
```bash
git remote add origin https://github.com/你的用户名/leeyoung-website.git
git branch -M main
git push -u origin main
```

**GitLab:**
```bash
git remote add origin https://gitlab.com/你的用户名/leeyoung-website.git
git branch -M main
git push -u origin main
```

---

### 第二步：在 Cloudflare Pages 创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. 连接你的 Git 仓库（GitHub 或 GitLab）
4. 选择 `leeyoung-website` 仓库

---

### 第三步：配置构建设置

在 Cloudflare Pages 设置页面填写：

| 配置项 | 值 |
|--------|-----|
| **Framework preset** | `Astro` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (默认) |
| **Node version** | `18` 或 `20` |

---

### 第四步：配置环境变量

在 **Settings → Environment variables** 中添加：

#### Production（生产环境）

```
WORDPRESS_GRAPHQL_URL=https://你的WordPress域名.com/graphql
WOOCOMMERCE_URL=https://你的WordPress域名.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Preview（预览环境，可选）

如果需要测试环境，添加相同的变量但使用测试密钥：

```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 第五步：配置 Cloudflare KV（Session 存储）

Cloudflare adapter 需要 KV 来存储 session。

1. 在 Cloudflare Dashboard 进入 **Workers & Pages** → 你的项目 → **Settings**
2. 找到 **Bindings** 部分
3. 点击 **Add** → **KV Namespace**
4. 设置：
   - **Variable name**: `SESSION`
   - **KV namespace**: 创建新的或选择现有的 KV namespace

---

### 第六步：配置 Stripe Webhook

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 进入 **Developers → Webhooks**
3. 点击 **Add endpoint**
4. 填写 Webhook 地址：
   ```
   https://你的域名.pages.dev/api/stripe/webhook
   ```
5. 选择监听事件：
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
6. 复制 **Signing secret**（`whsec_xxx`）
7. 回到 Cloudflare Pages，更新 `STRIPE_WEBHOOK_SECRET` 环境变量

---

### 第七步：部署

1. 点击 **Save and Deploy**
2. Cloudflare 会自动拉取代码并构建
3. 等待部署完成（通常 2-5 分钟）
4. 部署成功后会显示预览链接：`https://你的项目.pages.dev`

---

## 🔧 部署后配置

### 绑定自定义域名（可选）

1. 在 Cloudflare Pages 项目设置中
2. 进入 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入你的域名（例如：`www.leeyoung.com`）
5. Cloudflare 会自动配置 DNS 记录

---

## 🐛 常见问题

### Q1: 构建失败 - "Invalid binding `SESSION`"
**解决**: 在 Settings → Bindings 中添加 KV namespace，变量名必须是 `SESSION`

### Q2: 环境变量不生效
**解决**:
1. 确认环境变量已正确添加（注意大小写）
2. 重新部署（Settings → Deployments → Retry deployment）

### Q3: Stripe Webhook 返回 401 或 403
**解决**:
1. 检查 `STRIPE_WEBHOOK_SECRET` 是否正确
2. 确认 Webhook URL 是 `https://你的域名.pages.dev/api/stripe/webhook`
3. 查看 Stripe Dashboard → Webhooks → 查看失败请求日志

### Q4: 图片加载很慢
**解决**: Cloudflare 不支持 sharp at runtime。建议使用 Cloudflare Images 或外部 CDN。

### Q5: 页面报错 "There has been a critical error"
**解决**:
1. 检查 Cloudflare Pages Functions 日志（Deployments → View details → Functions）
2. 确认所有环境变量已正确设置
3. 检查 WordPress GraphQL API 是否可访问

---

## 📊 监控和日志

### 查看部署日志
1. 进入 Cloudflare Pages 项目
2. **Deployments** → 点击最新部署
3. 查看 **Build log** 和 **Function invocations**

### 查看实时日志
```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录
wrangler login

# 查看实时日志
wrangler pages deployment tail
```

---

## 🔄 更新部署

每次推送代码到 Git 仓库，Cloudflare Pages 会自动重新部署。

```bash
git add .
git commit -m "更新内容"
git push origin main
```

---

## 📞 技术支持

如有问题：
1. 查看 Cloudflare Pages 文档：https://developers.cloudflare.com/pages/
2. 查看 Astro Cloudflare 文档：https://docs.astro.build/en/guides/integrations-guide/cloudflare/
3. 查看项目根目录的 `DEPLOYMENT_GUIDE.md`

---

**部署完成！🎉**
