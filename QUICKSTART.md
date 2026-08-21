# 🚀 快速开始 - WooCommerce 集成

## 5 分钟配置指南

### 步骤 1: 配置 WordPress 后台

1. 登录 WordPress 管理后台
2. 进入 **WooCommerce > 设置 > 高级 > REST API**
3. 点击 **添加密钥**
4. 设置：
   - 描述: `Astro Frontend`
   - 用户: 选择管理员
   - 权限: **读取**
5. 点击 **生成 API 密钥**
6. 复制 Consumer Key 和 Consumer Secret（只显示一次）

### 步骤 2: 配置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件
# 将下面的值替换为你的实际配置
WORDPRESS_GRAPHQL_URL=https://your-site.com/graphql
WOOCOMMERCE_URL=https://your-site.com
WOOCOMMERCE_CONSUMER_KEY=ck_your_key_here
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret_here
```

### 步骤 3: 测试连接

```bash
# 启动开发服务器
npm run dev

# 在浏览器访问
http://localhost:4321/api/products
http://localhost:4321/api/categories
```

如果返回 JSON 数据，说明配置成功！

### 步骤 4: 访问 Shop 页面

```
http://localhost:4321/shop
```

你应该看到：
- ✅ 产品列表
- ✅ 分类筛选
- ✅ 排序功能
- ✅ 移动端 Drawer

## 📝 WordPress 产品配置

### 最小配置（必须）
- ✅ 产品名称
- ✅ 价格
- ✅ 至少一张产品图片
- ✅ 分配到某个分类

### 推荐配置
- 📷 多张产品图片
- 🏷️ 产品分类
- ⭐ 产品评分
- 💰 促销价格（显示 SALE 标签）
- ✨ 特色产品（显示 FEATURED 标签）
- 📝 简短描述

## 🔍 故障排除

### 问题：API 返回 401 错误
```bash
# 检查 .env 文件是否正确配置
cat .env

# 确认密钥没有多余的空格
```

### 问题：图片不显示
- 确认产品已上传图片
- 检查 WordPress 媒体库权限
- 确认图片 URL 可访问

### 问题：分类为空
- 在 WordPress 后台创建产品分类
- 将产品分配到分类

## 📚 完整文档

- [WooCommerce 配置指南](./WOOCOMMERCE_SETUP.md)
- [集成总结](./INTEGRATION_SUMMARY.md)

## 🆘 需要帮助？

检查控制台错误：
```bash
# 浏览器控制台 (F12)
# 查看网络请求和错误信息

# 或服务器日志
npm run dev
```

---

配置完成！现在可以开始开发产品详情页和购物车功能了 🎉
