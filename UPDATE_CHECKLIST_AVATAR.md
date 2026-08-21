# 头像持久化修复 - 快速更新清单

## ⚠️ 重要提示
WordPress 插件已更新，需要重新上传并激活！

## 更新步骤

### ✅ Step 1: 更新 WordPress 插件（必须）
- [ ] 1. 登录 WordPress 后台：https://imanmlhijab.com/wp-admin
- [ ] 2. 进入 **插件** → **已安装的插件**
- [ ] 3. 找到 "Avatar Upload API" 并 **停用**
- [ ] 4. 点击 **删除** 删除旧版本
- [ ] 5. 通过 FTP/cPanel 上传新的 `avatar-upload-api.php` 到 `/wp-content/plugins/`
- [ ] 6. 返回 WordPress 后台，**激活** 插件

### ✅ Step 2: 验证新端点
在浏览器控制台运行：
```javascript
fetch('https://imanmlhijab.com/wp-json/custom/v1/get-avatar')
  .then(r => r.json())
  .then(console.log)
```
应该看到响应（即使是错误也表示端点存在）

### ✅ Step 3: 重启开发服务器
```bash
# 停止当前服务器（Ctrl+C）
npm run dev
```

### ✅ Step 4: 测试头像持久化
- [ ] 1. 访问：http://localhost:4321/account/settings
- [ ] 2. 上传头像（如果还没有）
- [ ] 3. 点击导航栏的 "My Orders"
- [ ] 4. 再点击 "Account Settings" 返回
- [ ] 5. **头像应该仍然显示** ✓

### ✅ Step 5: 测试页面刷新
- [ ] 在账户设置页面按 F5 刷新
- [ ] 头像应该立即显示（不会闪烁）

## 问题修复内容

### 之前的问题
❌ 头像上传后只在当前页面显示
❌ 切换页面后头像消失
❌ 刷新页面后头像不显示

### 现在的效果
✅ 头像上传后保存到 WordPress 数据库
✅ 所有页面都能正确显示头像
✅ 刷新页面后头像持久显示
✅ 头像在 Header、设置页、订单页都一致显示

## 技术改动

### WordPress 插件更新
```
avatar-upload-api.php
├── 新增端点: /wp-json/custom/v1/get-avatar
└── 从 WordPress user meta 读取 custom_avatar
```

### 前端更新
```
src/pages/api/auth/session.ts
└── 调用新端点获取自定义头像
```

## 文件对比

### 需要更新的文件
- ✅ `avatar-upload-api.php` - 已更新（需重新上传到 WordPress）

### 自动生效的文件
- ✅ `src/pages/api/auth/session.ts` - 已更新（本地已生效）

## 快速验证命令

### 检查 WordPress 端点
```bash
curl https://imanmlhijab.com/wp-json/custom/v1/get-avatar
```

### 检查本地 Session API
在浏览器控制台：
```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => {
    console.log('Avatar:', data.user.avatar);
    console.log('Authenticated:', data.authenticated);
  });
```

## 如果出现问题

### 问题 1: 头像还是不显示
**检查：**
- WordPress 插件是否已更新？
- 插件是否已激活？
- 浏览器控制台有无错误？

### 问题 2: 端点 404 错误
**原因：** 插件未正确安装或激活

**解决：**
1. 检查插件文件在 `/wp-content/plugins/avatar-upload-api.php`
2. WordPress 后台确认插件已激活
3. 尝试停用再激活插件

### 问题 3: 401 认证错误
**原因：** JWT token 无效

**解决：**
1. 退出登录
2. 重新登录
3. 清除浏览器 Cookie

## 数据流程图

```
用户访问任何页面
        ↓
调用 /api/auth/session
        ↓
    ┌───┴───┐
    │       │
获取客户   获取头像
数据      (新增)
    │       │
    │    WordPress
    │    user meta
    │       ↓
    │   custom_avatar
    │       │
    └───┬───┘
        ↓
   返回完整用户信息
   (包含自定义头像)
        ↓
   页面显示头像
```

## 完成标志

当你看到以下情况时，表示修复成功：

✅ 上传头像后，所有页面都显示
✅ 刷新页面，头像依然存在
✅ 退出再登录，头像依然存在
✅ Header 下拉菜单显示正确头像
✅ 账户设置页显示正确头像
✅ 订单页面（如果显示头像）也正确

## 需要帮助？

查看详细文档：`AVATAR_PERSISTENCE_FIX.md`

---

## 📌 记住
**最重要的步骤：更新 WordPress 插件！**

没有这一步，前端更新不会生效。
