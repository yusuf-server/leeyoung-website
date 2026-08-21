# 头像错乱问题 - 快速测试指南

## 问题现象

用户 B 上传头像后，在账户设置页面显示上传成功，但切换页面后又变成用户 A 的头像。WordPress 媒体库中确实有用户 B 上传的图片。

## 可能原因

1. **JWT Token 混乱** - 不同用户的 token 返回了相同的 user_id
2. **Session Cookie 未刷新** - 登录后 cookie 仍然是旧用户的
3. **WordPress User Meta 保存错误** - 头像保存到了错误的用户

## 快速诊断步骤

### 1. 更新 WordPress 插件

已添加调试信息到 `avatar-upload-api.php`，需要重新上传到 WordPress：

```
/wp-content/plugins/avatar-upload-api.php
```

重新激活插件。

### 2. 测试上传流程

**用户 B 登录后上传头像：**

1. 打开浏览器控制台（F12）
2. 进入账户设置页面
3. 上传头像
4. 查看控制台输出的 `Avatar upload response:`

**检查返回信息：**

```javascript
{
  "success": true,
  "avatar_url": "https://...",
  "user_id": 123,           // ← 这个应该是用户 B 的 ID
  "username": "userB",       // ← 这个应该是用户 B 的用户名
  "auth_method": "jwt_manual", // ← 认证方式
  "saved_to_meta": true      // ← 是否成功保存到 user meta
}
```

**关键检查点：**

- `user_id` 是否是当前登录用户的 ID？
- `username` 是否是当前登录用户的用户名？
- `auth_method` 是什么？（jwt_manual、jwt_plugin、wp_session）
- `saved_to_meta` 是否为 `true`？

### 3. 如果出现 User ID 不匹配

如果控制台显示：

```
错误：头像上传到了错误的用户！
上传用户ID: 123
当前用户ID: 456
```

说明 JWT token 有问题。

**解决方法：**

1. **退出登录**
2. **清除浏览器缓存和 Cookies**
3. **重新登录**

或者在控制台运行：

```javascript
// 清除所有 cookies
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

// 刷新页面
window.location.reload();
```

### 4. 检查 WordPress 数据库

登录 WordPress 数据库，运行：

```sql
-- 查看所有用户的头像
SELECT
  u.ID as user_id,
  u.user_login,
  m1.meta_value as avatar_url,
  m2.meta_value as avatar_id
FROM wp_users u
LEFT JOIN wp_usermeta m1 ON u.ID = m1.user_id AND m1.meta_key = 'custom_avatar'
LEFT JOIN wp_usermeta m2 ON u.ID = m2.user_id AND m2.meta_key = 'custom_avatar_id'
WHERE u.ID IN (用户A的ID, 用户B的ID)
ORDER BY u.ID;
```

**检查：**
- 每个用户是否有自己的 `custom_avatar` 记录？
- 头像 URL 是否正确关联到对应用户？

### 5. 使用调试工具

访问：
```
http://localhost:4321/avatar-debug
```

按照页面指示测试：

1. **用户 A 登录** → 点击"检查 Session"和"获取 WordPress 头像" → 记录 user_id
2. **用户 A 退出**
3. **用户 B 登录** → 重复测试 → 对比 user_id

## 已添加的修复措施

### 1. WordPress 插件增强

- ✅ 添加 `auth_method` 字段显示认证方式
- ✅ 添加 `username` 字段显示用户名
- ✅ 验证 user meta 保存成功 (`saved_to_meta`)
- ✅ 返回调试信息 (`debug`)

### 2. 前端验证

- ✅ 上传后验证返回的 `user_id` 与当前 session 一致
- ✅ 如果不一致，显示错误警告
- ✅ 上传成功后自动刷新页面（确保加载最新头像）
- ✅ 头像 URL 添加时间戳避免缓存

### 3. Session 刷新

上传成功后会自动刷新页面，确保：
- Session API 重新获取用户信息
- 头像 URL 从 WordPress 读取最新数据
- 清除浏览器缓存的旧头像

## 测试清单

完成以下步骤确认问题已解决：

- [ ] 更新 WordPress 插件并重新激活
- [ ] 用户 A 登录并上传头像
- [ ] 检查控制台输出的 `user_id` 和 `username`
- [ ] 确认显示"头像上传成功"并自动刷新
- [ ] 用户 A 退出登录
- [ ] 清除浏览器缓存
- [ ] 用户 B 登录
- [ ] 用户 B 上传头像
- [ ] 检查控制台输出（应该是用户 B 的信息）
- [ ] 确认上传成功后看到的是用户 B 的头像
- [ ] 切换到其他页面再回来
- [ ] 确认仍然显示用户 B 的头像
- [ ] 刷新页面
- [ ] 确认头像持续显示

## 预期结果

✅ 上传时控制台显示：
```
Avatar upload response: {
  user_id: [正确的当前用户ID],
  username: [正确的当前用户名],
  auth_method: "jwt_manual",
  saved_to_meta: true
}
```

✅ 弹窗显示：
```
头像上传成功！
用户: [当前用户名]
认证方式: jwt_manual
```

✅ 1秒后页面自动刷新，显示新头像

✅ 切换页面后头像仍然正确显示

## 如果问题仍然存在

请提供以下信息：

1. **控制台完整输出**（`Avatar upload response` 的内容）
2. **弹窗显示的信息**
3. **两个用户的 user_id**
4. **WordPress 数据库查询结果**
5. **avatar-debug 页面的截图**

---

**立即开始：** 更新 WordPress 插件 → 用户 B 登录 → 上传头像 → 查看控制台输出
