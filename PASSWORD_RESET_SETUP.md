# 密码重置功能配置指南

## 概述

当前密码重置功能已经在前端实现，但需要配置 WordPress 后端，让密码重置邮件中的链接指向你自己的网站，而不是 WordPress 默认页面。

---

## 当前实现

### 前端页面
1. **`/reset-password`** - 用户输入邮箱申请重置
2. **`/reset-password/confirm`** - 用户设置新密码

### API 端点
1. **`/api/auth/reset-password`** - 发送重置邮件
2. **`/api/auth/reset-password/confirm`** - 完成密码重置

### 工作流程
1. 用户在 `/reset-password` 输入邮箱
2. WordPress 发送重置邮件
3. **问题：邮件中的链接默认指向 WordPress 域名**
4. 用户可能因为域名不一致而担心安全问题

---

## 解决方案：自定义密码重置邮件

### 步骤 1：找到 WordPress 主题的 functions.php

1. 登录 WordPress 后台
2. 进入 **外观 (Appearance) > 主题文件编辑器 (Theme File Editor)**
3. 在右侧文件列表中找到 **functions.php**

> ⚠️ **重要提示**：如果使用子主题 (Child Theme)，请在子主题的 `functions.php` 中添加代码。这样更新主题时不会丢失自定义代码。

---

### 步骤 2：添加自定义代码

将以下代码添加到 `functions.php` 文件的**最后面**：

```php
<?php
// ============================================
// 自定义密码重置邮件
// ============================================

/**
 * 修改密码重置邮件中的链接，指向自定义前端页面
 */
add_filter('retrieve_password_message', 'custom_password_reset_message', 10, 4);

function custom_password_reset_message($message, $key, $user_login, $user_data) {
    // 🔧 修改这里：改成你的网站实际域名
    $site_url = 'https://yourdomain.com';  // 例如：https://leeyoung.com

    // 生成指向你网站的重置链接
    $reset_url = $site_url . '/reset-password/confirm?key=' . $key . '&login=' . rawurlencode($user_login);

    // 自定义邮件内容（可以根据需要修改文案）
    $message = "Hi there,\n\n";
    $message .= "Someone requested a password reset for your account at " . get_bloginfo('name') . ".\n\n";
    $message .= "If this was you, click the link below to reset your password:\n\n";
    $message .= $reset_url . "\n\n";
    $message .= "If you didn't request this, you can safely ignore this email. Your password will not be changed.\n\n";
    $message .= "This link will expire in 24 hours for security reasons.\n\n";
    $message .= "Best regards,\n";
    $message .= get_bloginfo('name') . " Team";

    return $message;
}

/**
 * 修改密码重置邮件的主题行
 */
add_filter('retrieve_password_title', 'custom_password_reset_subject');

function custom_password_reset_subject($title) {
    return '[' . get_bloginfo('name') . '] Reset Your Password';
}

/**
 * 可选：自定义发件人名称
 */
add_filter('wp_mail_from_name', 'custom_mail_from_name');

function custom_mail_from_name($name) {
    return get_bloginfo('name');
}
```

---

### 步骤 3：修改域名

在代码中找到这一行：

```php
$site_url = 'https://yourdomain.com';  // 🔧 改成你的实际域名
```

将 `https://yourdomain.com` 改成你的网站实际域名，例如：
- `https://leeyoung.com`
- `https://www.yoursite.com`

⚠️ **注意**：
- 确保使用 `https://` 而不是 `http://`
- 不要在末尾加斜杠 `/`
- 域名要和你的生产环境一致

---

### 步骤 4：保存并测试

1. 点击 **更新文件 (Update File)** 保存修改
2. 访问你的网站 `/reset-password` 页面
3. 输入一个测试邮箱地址
4. 检查收到的邮件，确认链接指向你的域名
5. 点击链接，应该跳转到 `/reset-password/confirm?key=...&login=...`
6. 输入新密码完成重置

---

## 测试清单

- [ ] WordPress `functions.php` 已添加代码
- [ ] 域名已修改为实际域名
- [ ] 文件已保存，没有语法错误
- [ ] 在 `/reset-password` 申请重置密码
- [ ] 收到邮件，邮件主题正确
- [ ] 邮件中的链接指向自己的域名
- [ ] 点击链接跳转到 `/reset-password/confirm` 页面
- [ ] 可以成功设置新密码
- [ ] 重置后可以用新密码登录

---

## 常见问题

### Q1：没有收到邮件怎么办？

**可能原因：**
1. WordPress 邮件发送功能未配置
2. 邮件被标记为垃圾邮件
3. 服务器不支持发送邮件

**解决方案：**
1. 检查垃圾邮件箱
2. 安装 WordPress SMTP 插件（如 WP Mail SMTP）配置邮件服务
3. 使用邮件服务提供商（如 SendGrid、Mailgun、AWS SES）

---

### Q2：点击邮件链接后显示"链接已过期"？

**原因：**
WordPress 的密码重置链接默认 24 小时后过期。

**解决方案：**
如果需要延长有效期，可以在 `functions.php` 添加：

```php
// 修改密码重置链接有效期为 48 小时
add_filter('password_reset_expiration', function() {
    return DAY_IN_SECONDS * 2;  // 2 天
});
```

---

### Q3：修改 functions.php 后网站白屏怎么办？

**原因：**
PHP 语法错误。

**解决方案：**
1. 通过 FTP/SFTP 连接服务器
2. 找到 `wp-content/themes/你的主题名/functions.php`
3. 删除刚才添加的代码
4. 或者恢复之前的备份

⚠️ **预防措施**：修改前先备份 `functions.php` 文件！

---

### Q4：可以自定义邮件样式吗？

**可以！** 修改 `custom_password_reset_message` 函数中的 `$message` 变量。

**示例 - 添加 HTML 样式：**

需要配合 WordPress 的 HTML 邮件功能，或使用插件如 "WP HTML Mail"。

简单纯文本版本已经足够使用。如果需要 HTML 邮件模板，可以：
1. 使用 "Email Customizer for WooCommerce" 插件
2. 使用 "WP Mail SMTP" + 模板功能

---

### Q5：我不想修改 WordPress 代码，有其他方案吗？

**方案 A：使用插件**
- 安装 "Password Reset" 或 "Email Customizer" 类插件
- 在插件设置中修改邮件模板和链接

**方案 B：完全自定义邮件系统**
- 不使用 WordPress 邮件功能
- 在 `/api/auth/reset-password.ts` 中自己发送邮件
- 需要配置第三方邮件服务（SendGrid、Mailgun 等）
- 需要额外开发工作

**推荐：** 还是修改 `functions.php` 最简单直接。

---

## 安全建议

1. **使用 HTTPS**：确保网站启用 SSL 证书
2. **验证邮箱**：密码重置邮件只发送到注册邮箱
3. **链接过期**：默认 24 小时过期是合理的
4. **限制频率**：WordPress 默认限制同一邮箱 10 分钟内只能申请一次
5. **日志记录**：可以添加日志记录密码重置操作

---

## 生产环境部署注意事项

### 开发环境 vs 生产环境

在 `functions.php` 中，可以根据环境自动切换域名：

```php
function custom_password_reset_message($message, $key, $user_login, $user_data) {
    // 自动检测域名
    if (defined('WP_ENV') && WP_ENV === 'development') {
        $site_url = 'http://localhost:4321';  // 开发环境
    } else {
        $site_url = 'https://yourdomain.com';  // 生产环境
    }

    // ... 其余代码保持不变
}
```

---

## 总结

### 优点 ✅
- 用户全程在你的品牌域名下操作
- 不会因为域名跳转而担心安全
- 实现简单，只需修改一个文件
- 使用 WordPress 原生安全机制

### 需要注意 ⚠️
- 需要访问 WordPress 后台
- 修改前记得备份
- 测试邮件发送功能是否正常

### 替代方案
如果实在不想修改 WordPress，可以：
1. 直接让用户点击邮件中的 WordPress 链接（在邮件中说明）
2. 在账户设置页面完全移除密码修改功能
3. 提供"联系客服修改密码"的方式

---

## 技术支持

如果配置过程中遇到问题，可以：
1. 检查 WordPress 错误日志
2. 使用 "Email Log" 插件查看邮件发送记录
3. 咨询 WordPress 主机提供商的技术支持

---

**最后更新时间：** 2026-08-21
