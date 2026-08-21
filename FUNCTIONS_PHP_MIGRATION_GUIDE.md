# 🔄 Functions.php 迁移指南

## 📋 概述

分析你现有的 `functions.php` 代码，判断哪些需要保留到新的 WordPress 环境。

---

## ✅ 必须保留的代码

### 1. **评论图片上传端点** (必需 ✅)

**代码块**: 第 106-160 行
```php
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/upload-review-media', array(
        'methods' => 'POST',
        'callback' => 'handle_review_media_upload',
        'permission_callback' => '__return_true',
    ));
});

function handle_review_media_upload($request) {
    // ... 完整代码
}
```

**保留原因**:
- 前端评论系统依赖此端点上传图片
- 无头架构核心功能

**状态**: ✅ 完全保留

---

### 2. **颜色映射管理** (必需 ✅)

**代码块**: 第 169-366 行 (整个颜色映射管理系统)

包括：
- `color_mapping_enqueue_scripts()`
- `add_color_mapping_meta_box()`
- `render_color_mapping_meta_box()`
- `save_color_mapping_meta_box()`

**保留原因**:
- 可变产品的颜色选择器依赖此功能
- 产品详情页显示颜色色卡需要 `color_mapping` meta 数据

**状态**: ✅ 完全保留

---

### 3. **3D 模型文件上传支持** (可选但推荐 ⚠️)

**代码块**: 第 20-104 行

包括：
- `allow_3d_model_uploads()` - 允许 .glb/.gltf 上传
- `fix_3d_model_mime_type()` - 修复 MIME 类型
- `add_cors_headers_for_3d_models()` - CORS 支持
- `add_cors_to_uploads()` - 媒体库 CORS
- `handle_cors_for_3d_models()` - OPTIONS 预检
- `add_cors_headers_globally()` - 全局 CORS

**保留原因**:
- 如果产品详情页有 3D 模型展示功能 (`model_3d_url` 字段)
- 提供 CORS 支持，允许前端加载 3D 模型

**判断方法**:
```bash
# 检查是否有产品使用了 3D 模型
SELECT post_id FROM wp_postmeta WHERE meta_key = 'model_3d_url' AND meta_value != '';
```

**建议**:
- ✅ 保留 - 如果有 3D 模型展示需求
- ❌ 删除 - 如果完全不用 3D 模型

---

## ⚠️ 需要修改的代码

### 4. **CORS 配置** (需要修改域名 ⚠️)

**代码块**: 第 371-442 行

```php
add_action('init', function() {
    $allowed_origins = [
        'https://imanmlhijab.com',        // ← 修改为新域名
        'https://your-frontend.pages.dev', // ← 修改为实际 Cloudflare Pages 域名
        'http://localhost:4321',
        'http://localhost:3000',
    ];
    // ...
});
```

**需要修改的地方**:
1. 将所有 `imanmlhijab.com` 替换为新的前端域名
2. 添加新的 Cloudflare Pages 域名
3. 保留 `localhost` 用于开发

**修改后示例**:
```php
$allowed_origins = [
    'https://new-frontend-domain.com',     // 新前端域名
    'https://new-site.pages.dev',          // Cloudflare Pages
    'http://localhost:4321',               // 开发环境
];
```

**状态**: ⚠️ 修改后保留

---

## ❌ 可以删除的代码

### 5. **WooCommerce Checkout 页面美化** (删除 ❌)

**代码块**: 第 444-651 行

包括：
- `wp_head` 中的 CSS 样式
- Checkout 页面的美化样式
- 自定义 Logo 显示
- 支付成功跳转逻辑

**删除原因**:
- 你使用的是 **Headless 架构**，完全不使用 WordPress 的 Checkout 页面
- 前端 Checkout 页面在 Astro (`src/pages/checkout.astro`)
- 这些样式和逻辑在无头架构中完全用不到

**代码位置**:
```php
// 4. 美化支付页面样式
add_action('wp_head', function() { ... });

// 5. 在支付页面添加自定义logo
add_action('woocommerce_before_checkout_form', function() { ... });

// 6. 自定义支付成功后的跳转
add_action('woocommerce_thankyou', function($order_id) { ... });
```

**状态**: ❌ 全部删除

---

## 🆕 需要添加的新代码

### 6. **JWT Token 登录端点** (必需添加 ✅)

你的旧代码中**缺少**这个端点，但新架构需要它（用于自动注册和登录）。

**添加代码**:
```php
/**
 * JWT Token 登录端点
 * 用于用户自动注册和登录
 */
add_action('rest_api_init', function () {
    register_rest_route('api/v1', '/token', [
        'methods' => 'POST',
        'callback' => 'custom_jwt_auth',
        'permission_callback' => '__return_true'
    ]);
});

function custom_jwt_auth($request) {
    $params = $request->get_json_params();
    $username = $params['username'] ?? '';
    $password = $params['password'] ?? '';

    if (empty($username) || empty($password)) {
        return new WP_Error('missing_credentials', 'Username and password are required', ['status' => 400]);
    }

    $user = wp_authenticate($username, $password);

    if (is_wp_error($user)) {
        return new WP_Error('invalid_credentials', 'Invalid username or password', ['status' => 401]);
    }

    // 生成 JWT token
    $issued_at = time();
    $expiration = $issued_at + (DAY_IN_SECONDS * 7); // 7天有效期

    $token_data = [
        'iss' => get_bloginfo('url'),
        'iat' => $issued_at,
        'exp' => $expiration,
        'data' => [
            'user' => [
                'id' => $user->ID,
                'username' => $user->user_login,
                'email' => $user->user_email
            ]
        ]
    ];

    // 使用简单的 base64 编码（生产环境建议使用真正的 JWT 库）
    $jwt = base64_encode(json_encode($token_data));

    return [
        'jwt_token' => $jwt,
        'user_id' => $user->ID,
        'user_email' => $user->user_email,
        'user_nicename' => $user->user_nicename,
        'user_display_name' => $user->display_name
    ];
}
```

**注意**:
- 生产环境建议安装 `firebase/php-jwt` 库，使用真正的 JWT 加密
- 或者安装 "JWT Authentication for WP REST API" 插件

---

### 7. **用户头像上传端点** (必需添加 ✅)

你的旧代码中也**缺少**这个端点。

**添加代码**:
```php
/**
 * 用户头像上传端点
 */
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/upload-avatar', [
        'methods' => 'POST',
        'callback' => 'upload_user_avatar',
        'permission_callback' => 'is_user_logged_in'
    ]);
});

function upload_user_avatar($request) {
    $current_user = wp_get_current_user();

    if (!$current_user || $current_user->ID === 0) {
        return new WP_Error('not_logged_in', 'User not logged in', ['status' => 401]);
    }

    $body = $request->get_body();
    $content_type = $request->get_header('content_type');

    if (empty($body)) {
        return new WP_Error('no_data', 'No file data provided', ['status' => 400]);
    }

    // 确定文件扩展名
    $file_extension = 'jpg';
    if (strpos($content_type, 'image/png') !== false) {
        $file_extension = 'png';
    } elseif (strpos($content_type, 'image/gif') !== false) {
        $file_extension = 'gif';
    } elseif (strpos($content_type, 'image/webp') !== false) {
        $file_extension = 'webp';
    }

    $filename = 'avatar_' . $current_user->ID . '_' . time() . '.' . $file_extension;

    // 上传目录
    $upload_dir = wp_upload_dir();
    $file_path = $upload_dir['path'] . '/' . $filename;
    $file_url = $upload_dir['url'] . '/' . $filename;

    // 保存文件
    file_put_contents($file_path, $body);

    // 添加到媒体库
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');

    $attachment = [
        'post_mime_type' => $content_type,
        'post_title' => 'Avatar for user ' . $current_user->ID,
        'post_content' => '',
        'post_status' => 'inherit',
        'post_author' => $current_user->ID
    ];

    $attach_id = wp_insert_attachment($attachment, $file_path);

    // 生成缩略图
    $attach_data = wp_generate_attachment_metadata($attach_id, $file_path);
    wp_update_attachment_metadata($attach_id, $attach_data);

    // 保存到用户 meta
    update_user_meta($current_user->ID, 'custom_avatar_url', $file_url);
    update_user_meta($current_user->ID, 'custom_avatar_attachment_id', $attach_id);

    return [
        'success' => true,
        'avatar_url' => $file_url,
        'attachment_id' => $attach_id
    ];
}

/**
 * 获取用户头像端点
 */
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/get-avatar', [
        'methods' => 'GET',
        'callback' => 'get_user_avatar',
        'permission_callback' => 'is_user_logged_in'
    ]);
});

function get_user_avatar($request) {
    $current_user = wp_get_current_user();

    if (!$current_user || $current_user->ID === 0) {
        return new WP_Error('not_logged_in', 'User not logged in', ['status' => 401]);
    }

    $avatar_url = get_user_meta($current_user->ID, 'custom_avatar_url', true);

    if (empty($avatar_url)) {
        // 返回 Gravatar 作为后备
        $avatar_url = get_avatar_url($current_user->ID, ['size' => 96]);
    }

    return [
        'success' => true,
        'avatar_url' => $avatar_url,
        'user_id' => $current_user->ID
    ];
}
```

---

## 📝 最终的 functions.php 结构

```php
<?php
/**
 * Blocksy functions and definitions
 */

if (version_compare(PHP_VERSION, '5.7.0', '<')) {
    require get_template_directory() . '/inc/php-fallback.php';
    return;
}

require get_template_directory() . '/inc/init.php';

add_filter('blocksy:ext:woocommerce-extra:swatches:css', '__return_true');

// ==========================================
// 1. 3D 模型文件上传支持（可选）
// ==========================================
add_filter('upload_mimes', 'allow_3d_model_uploads');
function allow_3d_model_uploads($mimes) {
    $mimes['glb'] = 'model/gltf-binary';
    $mimes['gltf'] = 'model/gltf+json';
    return $mimes;
}

add_filter('wp_check_filetype_and_ext', 'fix_3d_model_mime_type', 10, 4);
function fix_3d_model_mime_type($data, $file, $filename, $mimes) {
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    if ($ext === 'glb') {
        $data['ext'] = 'glb';
        $data['type'] = 'model/gltf-binary';
    } elseif ($ext === 'gltf') {
        $data['ext'] = 'gltf';
        $data['type'] = 'model/gltf+json';
    }
    return $data;
}

// CORS 支持（用于 3D 模型）
add_action('send_headers', 'add_cors_headers_for_3d_models');
function add_cors_headers_for_3d_models() {
    if (isset($_SERVER['REQUEST_URI']) &&
        (strpos($_SERVER['REQUEST_URI'], '.glb') !== false ||
         strpos($_SERVER['REQUEST_URI'], '.gltf') !== false)) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET');
        header('Access-Control-Allow-Headers: Content-Type');
    }
}

add_filter('wp_headers', 'add_cors_to_uploads', 11, 1);
function add_cors_to_uploads($headers) {
    if (isset($_SERVER['REQUEST_URI']) &&
        strpos($_SERVER['REQUEST_URI'], '/wp-content/uploads/') !== false) {
        $headers['Access-Control-Allow-Origin'] = '*';
        $headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
        $headers['Access-Control-Allow-Headers'] = 'Content-Type';
    }
    return $headers;
}

add_action('init', 'handle_cors_for_3d_models');
function handle_cors_for_3d_models() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        if (isset($_SERVER['REQUEST_URI']) &&
            (strpos($_SERVER['REQUEST_URI'], '.glb') !== false ||
             strpos($_SERVER['REQUEST_URI'], '.gltf') !== false ||
             strpos($_SERVER['REQUEST_URI'], '/wp-content/uploads/') !== false)) {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            header('Access-Control-Max-Age: 86400');
            exit(0);
        }
    }
}

add_action('send_headers', 'add_cors_headers_globally');
function add_cors_headers_globally() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

// ==========================================
// 2. 评论图片上传端点（必需）
// ==========================================
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/upload-review-media', array(
        'methods' => 'POST',
        'callback' => 'handle_review_media_upload',
        'permission_callback' => '__return_true',
    ));
});

function handle_review_media_upload($request) {
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');

    $image_data = $request->get_body();

    if (empty($image_data)) {
        return new WP_Error('no_data', 'No image data received', array('status' => 400));
    }

    $content_type = $request->get_header('content_type');
    $ext = 'jpg';
    if (strpos($content_type, 'png') !== false) {
        $ext = 'png';
    } elseif (strpos($content_type, 'jpeg') !== false || strpos($content_type, 'jpg') !== false) {
        $ext = 'jpg';
    } elseif (strpos($content_type, 'gif') !== false) {
        $ext = 'gif';
    } elseif (strpos($content_type, 'webp') !== false) {
        $ext = 'webp';
    }

    $filename = 'review-' . time() . '-' . wp_generate_password(8, false) . '.' . $ext;
    $upload_dir = wp_upload_dir();
    $file_path = $upload_dir['path'] . '/' . $filename;

    file_put_contents($file_path, $image_data);

    $attachment = array(
        'post_mime_type' => $content_type,
        'post_title'     => sanitize_file_name($filename),
        'post_content'   => '',
        'post_status'    => 'inherit'
    );

    $attachment_id = wp_insert_attachment($attachment, $file_path);

    if (is_wp_error($attachment_id)) {
        return new WP_Error('upload_failed', $attachment_id->get_error_message(), array('status' => 400));
    }

    $attachment_data = wp_generate_attachment_metadata($attachment_id, $file_path);
    wp_update_attachment_metadata($attachment_id, $attachment_data);

    return array(
        'success' => true,
        'id' => $attachment_id,
        'url' => wp_get_attachment_url($attachment_id)
    );
}

// ==========================================
// 3. 颜色映射管理（必需）
// ==========================================
add_action('admin_enqueue_scripts', 'color_mapping_enqueue_scripts');
function color_mapping_enqueue_scripts($hook) {
    if ('post.php' !== $hook && 'post-new.php' !== $hook) {
        return;
    }

    global $post;
    if (!$post || $post->post_type !== 'product') {
        return;
    }

    wp_enqueue_media();
}

add_action('add_meta_boxes', 'add_color_mapping_meta_box');
function add_color_mapping_meta_box() {
    add_meta_box(
        'color_mapping_meta_box',
        '颜色映射管理 (Color Mapping)',
        'render_color_mapping_meta_box',
        'product',
        'side',
        'default'
    );
}

function render_color_mapping_meta_box($post) {
    // [保留完整的颜色映射管理 UI 代码 - 第 207-350 行]
    // 这里省略完整代码，从旧文件复制
}

add_action('save_post_product', 'save_color_mapping_meta_box', 10, 1);
function save_color_mapping_meta_box($post_id) {
    // [保留完整的保存逻辑 - 第 353-366 行]
    // 这里省略完整代码，从旧文件复制
}

// ==========================================
// 4. JWT Token 登录端点（新增）
// ==========================================
add_action('rest_api_init', function () {
    register_rest_route('api/v1', '/token', [
        'methods' => 'POST',
        'callback' => 'custom_jwt_auth',
        'permission_callback' => '__return_true'
    ]);
});

function custom_jwt_auth($request) {
    $params = $request->get_json_params();
    $username = $params['username'] ?? '';
    $password = $params['password'] ?? '';

    if (empty($username) || empty($password)) {
        return new WP_Error('missing_credentials', 'Username and password are required', ['status' => 400]);
    }

    $user = wp_authenticate($username, $password);

    if (is_wp_error($user)) {
        return new WP_Error('invalid_credentials', 'Invalid username or password', ['status' => 401]);
    }

    $issued_at = time();
    $expiration = $issued_at + (DAY_IN_SECONDS * 7);

    $token_data = [
        'iss' => get_bloginfo('url'),
        'iat' => $issued_at,
        'exp' => $expiration,
        'data' => [
            'user' => [
                'id' => $user->ID,
                'username' => $user->user_login,
                'email' => $user->user_email
            ]
        ]
    ];

    $jwt = base64_encode(json_encode($token_data));

    return [
        'jwt_token' => $jwt,
        'user_id' => $user->ID,
        'user_email' => $user->user_email,
        'user_nicename' => $user->user_nicename,
        'user_display_name' => $user->display_name
    ];
}

// ==========================================
// 5. 用户头像上传端点（新增）
// ==========================================
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/upload-avatar', [
        'methods' => 'POST',
        'callback' => 'upload_user_avatar',
        'permission_callback' => 'is_user_logged_in'
    ]);

    register_rest_route('custom/v1', '/get-avatar', [
        'methods' => 'GET',
        'callback' => 'get_user_avatar',
        'permission_callback' => 'is_user_logged_in'
    ]);
});

function upload_user_avatar($request) {
    // [添加完整的头像上传代码 - 见上文]
}

function get_user_avatar($request) {
    // [添加完整的头像获取代码 - 见上文]
}

// ==========================================
// 6. CORS 配置（修改域名）
// ==========================================
add_action('init', function() {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    $allowed_origins = [
        'https://new-frontend-domain.com',  // ← 修改为新域名
        'https://new-site.pages.dev',       // ← Cloudflare Pages
        'http://localhost:4321',
        'http://localhost:3000',
    ];

    if (in_array($origin, $allowed_origins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, Cart-Token, X-WC-Store-API-Nonce, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit();
    }
});

add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $origin = get_http_origin();
        $allowed_origins = [
            'https://new-frontend-domain.com',
            'https://new-site.pages.dev',
            'http://localhost:4321',
            'http://localhost:3000',
        ];

        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, Cart-Token, X-WC-Store-API-Nonce, X-Requested-With');
        }

        return $value;
    });
}, 15);

add_filter('woocommerce_store_api_disable_nonce_check', '__return_true');

add_action('woocommerce_store_api_before_callbacks_registered', function() {
    add_filter('rest_pre_serve_request', function($served, $result, $request, $server) {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

        $allowed_origins = [
            'https://new-frontend-domain.com',
            'https://new-site.pages.dev',
            'http://localhost:4321',
            'http://localhost:3000',
        ];

        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, Cart-Token, X-WC-Store-API-Nonce, X-Requested-With');
        }

        return $served;
    }, 10, 4);
});
```

---

## ✅ 迁移检查清单

### 保留的代码
- [x] Blocksy 主题初始化代码 (第 1-17 行)
- [x] 3D 模型上传支持 (第 20-104 行) - 可选
- [x] 评论图片上传端点 (第 106-160 行)
- [x] 颜色映射管理系统 (第 169-366 行)
- [x] CORS 配置 (第 371-442 行) - 修改域名后保留

### 删除的代码
- [x] Checkout 页面美化样式 (第 444-651 行) - 完全删除

### 新增的代码
- [x] JWT Token 登录端点
- [x] 用户头像上传端点
- [x] 用户头像获取端点

---

## 🚀 迁移步骤

1. **备份旧 functions.php**
   ```bash
   cp functions.php functions.php.backup
   ```

2. **创建新 functions.php**
   - 复制 Blocksy 主题基础代码 (第 1-17 行)
   - 复制 3D 模型上传代码 (如果需要)
   - 复制评论图片上传端点
   - 复制颜色映射管理系统
   - **添加** JWT Token 登录端点 (新代码)
   - **添加** 用户头像上传端点 (新代码)
   - 复制 CORS 配置 (**修改域名**)
   - **删除** Checkout 页面美化代码

3. **修改域名**
   - 全局搜索 `imanmlhijab.com`
   - 替换为新的前端域名

4. **测试端点**
   ```bash
   # 测试评论图片上传
   curl -X POST https://new-wp-site.com/wp-json/custom/v1/upload-review-media \
     -H "Content-Type: image/jpeg" \
     --data-binary "@test.jpg"

   # 测试 JWT Token
   curl -X POST https://new-wp-site.com/wp-json/api/v1/token \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"password"}'
   ```

---

## 📊 代码统计

| 类别 | 行数 | 状态 |
|------|------|------|
| 保留（不变） | ~350 行 | ✅ |
| 删除 | ~210 行 | ❌ |
| 新增 | ~150 行 | 🆕 |
| 修改 | ~80 行 | ⚠️ |

**总计**: 最终 functions.php 约 **530 行**

---

## 💡 建议

1. **使用插件管理 JWT**: 安装 "JWT Authentication for WP REST API" 插件，替代手写的 JWT 代码
2. **分离自定义端点**: 考虑创建独立插件管理自定义端点，方便维护
3. **测试所有端点**: 迁移后逐一测试每个 API 端点
4. **监控 CORS**: 如果遇到 CORS 错误，检查 `$allowed_origins` 配置

---

## 🎯 结论

**简单总结**:
- ✅ 保留: 评论上传、颜色映射、CORS
- ❌ 删除: Checkout 页面美化代码
- 🆕 新增: JWT Token、用户头像端点
- ⚠️ 修改: CORS 域名配置

迁移完成后，你的新 WordPress 将完全支持无头前端的所有功能！
