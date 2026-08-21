# 📦 WooCommerce 产品数据迁移清单

## 🎯 概述

本文档列出从旧 WooCommerce 迁移到新 WordPress + WooCommerce 环境时，所有需要配置的自定义字段、插件和设置。

---

## 📋 目录

1. [必需插件](#必需插件)
2. [产品自定义字段](#产品自定义字段-meta_data)
3. [评论系统自定义功能](#评论系统自定义功能)
4. [用户头像自定义端点](#用户头像自定义端点)
5. [WooCommerce 基础设置](#woocommerce-基础设置)
6. [WordPress 自定义端点代码](#wordpress-自定义端点代码)
7. [迁移步骤](#迁移步骤)

---

## 🔌 必需插件

### 1. WPGraphQL (必需)
- **插件名称**: WPGraphQL
- **用途**: 提供 GraphQL API，用于博客内容查询
- **安装**: WordPress 后台 → 插件 → 安装插件 → 搜索 "WPGraphQL"
- **版本**: 最新稳定版
- **配置**: 安装后自动启用 `/graphql` 端点

### 2. WooCommerce (必需)
- **插件名称**: WooCommerce
- **用途**: 电商核心功能
- **版本**: 最新稳定版
- **配置**: 按照向导完成基础设置

### 3. JWT Authentication for WP REST API (必需)
- **插件名称**: JWT Authentication for WP REST API
- **用途**: 用户登录认证（自动注册功能需要）
- **安装**: 手动安装或通过插件市场
- **配置**:
  ```php
  // 在 wp-config.php 添加：
  define('JWT_AUTH_SECRET_KEY', 'your-secret-key-here');
  define('JWT_AUTH_CORS_ENABLE', true);
  ```
- **自定义端点**: `/wp-json/api/v1/token` (需要自定义代码，见下文)

### 4. Advanced Custom Fields (ACF) - 可选但推荐
- **插件名称**: Advanced Custom Fields (ACF)
- **用途**: 简化自定义字段管理（图形化界面）
- **是否必需**: 可选 - 也可以通过代码手动添加字段
- **好处**: 提供可视化界面管理产品自定义字段

---

## 📝 产品自定义字段 (meta_data)

以下所有字段都存储在 `wp_postmeta` 表中，或通过 WooCommerce REST API 的 `meta_data` 字段访问。

### 1. **使用场景评级** (usage_ratings)
- **字段名**: `usage_ratings`
- **数据类型**: JSON 字符串
- **用途**: 产品详情页显示不同使用场景的评分（如：公路、越野、山地等）
- **格式**:
  ```json
  [
    {
      "label": "Road",
      "rating": 4.5,
      "icon": "road"
    },
    {
      "label": "Gravel",
      "rating": 5,
      "icon": "gravel"
    },
    {
      "label": "Mountain",
      "rating": 3,
      "icon": "mountain"
    }
  ]
  ```
- **是否必需**: 可选 - 如果为空，该部分不显示
- **示例代码**:
  ```php
  // 在产品编辑页面添加
  update_post_meta($product_id, 'usage_ratings', json_encode([
      ['label' => 'Road', 'rating' => 4.5, 'icon' => 'road'],
      ['label' => 'Gravel', 'rating' => 5, 'icon' => 'gravel']
  ]));
  ```

### 2. **产品特点列表** (product_features)
- **字段名**: `product_features`
- **数据类型**: JSON 字符串数组
- **用途**: 产品详情页显示特点标签/徽章
- **格式**:
  ```json
  [
    "Premium Quality",
    "Fast Shipping",
    "Eco-Friendly",
    "30-Day Return",
    "Made in USA"
  ]
  ```
- **是否必需**: 可选 - 如果为空，显示默认特点
- **示例代码**:
  ```php
  update_post_meta($product_id, 'product_features', json_encode([
      'Premium Quality',
      'Fast Shipping',
      'Eco-Friendly'
  ]));
  ```

### 3. **描述区块标题** (description_title)
- **字段名**: `description_title`
- **数据类型**: 字符串
- **用途**: 自定义产品描述部分的标题
- **默认值**: "Purpose & Design"
- **是否必需**: 可选
- **示例**:
  ```php
  update_post_meta($product_id, 'description_title', 'Product Overview');
  ```

### 4. **特性卡片** (feature_cards)
- **字段名**: `feature_cards`
- **数据类型**: JSON 字符串
- **用途**: 产品详情页显示3个大型特性卡片（带图片、标题、描述）
- **格式**:
  ```json
  [
    {
      "title": "Wide Application",
      "description": "Road-OFF creates its own path...",
      "image": "https://example.com/image1.jpg"
    },
    {
      "title": "32-55mm Tires",
      "description": "Road tire or wide gravel tire?...",
      "image": "https://example.com/image2.jpg"
    }
  ]
  ```
- **是否必需**: 可选 - 如果为空，显示默认卡片
- **图片要求**: 建议尺寸 1200x675px
- **示例代码**:
  ```php
  update_post_meta($product_id, 'feature_cards', json_encode([
      [
          'title' => 'Wide Application',
          'description' => 'Perfect for all terrains...',
          'image' => 'https://example.com/feature1.jpg'
      ]
  ]));
  ```

### 5. **特性区块副标题** (features_subheading)
- **字段名**: `features_subheading`
- **数据类型**: 字符串
- **用途**: 特性区块的副标题
- **默认值**: "Discover the benefits"
- **是否必需**: 可选

### 6. **特性区块主标题** (features_title)
- **字段名**: `features_title`
- **数据类型**: 字符串
- **用途**: 特性区块的主标题
- **默认值**: "Key Features"
- **是否必需**: 可选

### 7. **产品画廊图片** (gallery_images)
- **字段名**: `gallery_images`
- **数据类型**: JSON 字符串
- **用途**: 产品详情页额外的大图展示区（除了主图库）
- **格式**:
  ```json
  [
    "https://example.com/gallery1.jpg",
    "https://example.com/gallery2.jpg",
    "https://example.com/gallery3.jpg"
  ]
  ```
- **是否必需**: 可选
- **图片要求**: 建议尺寸 1600x900px

### 8. **产品规格参数** (specifications)
- **字段名**: `specifications`
- **数据类型**: JSON 字符串
- **用途**: 显示产品技术规格表格
- **格式**:
  ```json
  [
    {
      "label": "Weight",
      "value": "1450g"
    },
    {
      "label": "Rim Width",
      "value": "25mm internal"
    },
    {
      "label": "Material",
      "value": "Carbon Fiber"
    }
  ]
  ```
- **是否必需**: 可选 - 如果为空，显示默认规格
- **示例代码**:
  ```php
  update_post_meta($product_id, 'specifications', json_encode([
      ['label' => 'Weight', 'value' => '1450g'],
      ['label' => 'Material', 'value' => 'Carbon Fiber']
  ]));
  ```

### 9. **规格图片** (specification_image)
- **字段名**: `specification_image`
- **数据类型**: 字符串 (URL)
- **用途**: 规格区块的配图
- **格式**: `"https://example.com/spec-diagram.jpg"`
- **是否必需**: 可选

### 10. **3D 模型 URL** (model_3d_url)
- **字段名**: `model_3d_url`
- **数据类型**: 字符串 (URL)
- **用途**: 嵌入 3D 模型查看器（如 Sketchfab）
- **格式**: `"https://sketchfab.com/models/xxxxx/embed"`
- **是否必需**: 可选

### 11. **颜色映射** (color_mapping)
- **字段名**: `color_mapping`
- **数据类型**: JSON 字符串
- **用途**: 可变产品的颜色变体映射（属性名 → 十六进制颜色）
- **格式**:
  ```json
  {
    "Black": "#000000",
    "White": "#FFFFFF",
    "Red": "#FF0000",
    "Blue": "#0000FF"
  }
  ```
- **是否必需**: 仅可变产品需要（如果有颜色属性）
- **示例代码**:
  ```php
  update_post_meta($product_id, 'color_mapping', json_encode([
      'Black' => '#000000',
      'White' => '#FFFFFF'
  ]));
  ```

---

## 💬 评论系统自定义功能

### 1. **评论图片上传**
- **功能**: 用户提交评论时可以上传图片
- **存储方式**: 图片 URL 以 HTML 注释形式嵌入评论内容
- **格式**:
  ```html
  <!-- REVIEW_IMAGES:["https://example.com/image1.jpg","https://example.com/image2.jpg"] -->
  ```
- **需要的 WordPress 端点**: `/wp-json/custom/v1/upload-review-media` (见下文代码)

### 2. **评论图片存储字段**
- **字段名**: 无独立字段，嵌入在 `comment_content` 中
- **解析逻辑**: 前端从评论内容中提取 `<!-- REVIEW_IMAGES:... -->` 标记
- **代码位置**: `src/pages/products/[slug].astro` (第 76-89 行)

---

## 👤 用户头像自定义端点

### 1. **上传头像 API**
- **端点**: `/wp-json/custom/v1/upload-avatar`
- **方法**: POST
- **用途**: 用户上传自定义头像
- **需要的 WordPress 代码**: 见下文

### 2. **获取头像 API**
- **端点**: `/wp-json/custom/v1/get-avatar`
- **方法**: GET
- **用途**: 获取用户头像 URL
- **需要的 WordPress 代码**: 见下文

---

## ⚙️ WooCommerce 基础设置

### 1. **产品类型**
确保支持以下产品类型：
- ✅ 简单产品 (Simple Product)
- ✅ 可变产品 (Variable Product)

### 2. **产品属性**
常用属性（根据你的产品需求）：
- Size (尺寸)
- Color (颜色) - 如果使用，需要配置 `color_mapping`
- Material (材质)
- 其他自定义属性

### 3. **产品分类**
确保所有产品分类已创建：
- 检查 `wp_terms` 和 `wp_term_taxonomy` 表
- 分类 slug 必须一致（前端通过 slug 筛选）

### 4. **产品图片**
- **主图库**: 使用 WooCommerce 默认的产品图片功能
- **图片尺寸**: 建议
  - Thumbnail: 300x300px
  - Medium: 768x768px
  - Large: 1024x1024px
  - Full: 1600x1600px (原图)

### 5. **评论设置**
- WordPress 后台 → 设置 → 讨论
- ✅ 启用评论功能
- ✅ 允许未登录用户评论（可选，根据需求）
- WooCommerce → 设置 → 产品
- ✅ 启用产品评论
- ✅ 显示"已验证购买"标签

---

## 💻 WordPress 自定义端点代码

将以下代码添加到主题的 `functions.php` 或创建自定义插件。

### 1. JWT Token 端点

```php
/**
 * 自定义 JWT Token 登录端点
 * 端点: /wp-json/api/v1/token
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

    $token = [
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

    $jwt = JWT::encode($token, JWT_AUTH_SECRET_KEY);

    return [
        'jwt_token' => $jwt,
        'user_id' => $user->ID,
        'user_email' => $user->user_email,
        'user_nicename' => $user->user_nicename,
        'user_display_name' => $user->display_name
    ];
}
```

### 2. 评论图片上传端点

```php
/**
 * 评论图片上传端点
 * 端点: /wp-json/custom/v1/upload-review-media
 */
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/upload-review-media', [
        'methods' => 'POST',
        'callback' => 'upload_review_media',
        'permission_callback' => '__return_true' // 允许所有用户上传
    ]);
});

function upload_review_media($request) {
    // 获取上传的文件数据
    $body = $request->get_body();
    $content_type = $request->get_header('content_type');

    if (empty($body)) {
        return new WP_Error('no_data', 'No file data provided', ['status' => 400]);
    }

    // 生成唯一文件名
    $file_extension = '';
    if (strpos($content_type, 'image/jpeg') !== false) {
        $file_extension = 'jpg';
    } elseif (strpos($content_type, 'image/png') !== false) {
        $file_extension = 'png';
    } elseif (strpos($content_type, 'image/gif') !== false) {
        $file_extension = 'gif';
    } elseif (strpos($content_type, 'image/webp') !== false) {
        $file_extension = 'webp';
    } else {
        return new WP_Error('invalid_type', 'Invalid image type', ['status' => 400]);
    }

    $filename = 'review_' . uniqid() . '.' . $file_extension;

    // 上传目录
    $upload_dir = wp_upload_dir();
    $file_path = $upload_dir['path'] . '/' . $filename;
    $file_url = $upload_dir['url'] . '/' . $filename;

    // 保存文件
    file_put_contents($file_path, $body);

    // 添加到媒体库
    $attachment = [
        'post_mime_type' => $content_type,
        'post_title' => sanitize_file_name($filename),
        'post_content' => '',
        'post_status' => 'inherit'
    ];

    $attach_id = wp_insert_attachment($attachment, $file_path);

    // 生成缩略图
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    $attach_data = wp_generate_attachment_metadata($attach_id, $file_path);
    wp_update_attachment_metadata($attach_id, $attach_data);

    return [
        'success' => true,
        'url' => $file_url,
        'attachment_id' => $attach_id
    ];
}
```

### 3. 用户头像上传端点

```php
/**
 * 用户头像上传端点
 * 端点: /wp-json/custom/v1/upload-avatar
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
    $file_extension = '';
    if (strpos($content_type, 'image/jpeg') !== false) {
        $file_extension = 'jpg';
    } elseif (strpos($content_type, 'image/png') !== false) {
        $file_extension = 'png';
    } elseif (strpos($content_type, 'image/gif') !== false) {
        $file_extension = 'gif';
    } elseif (strpos($content_type, 'image/webp') !== false) {
        $file_extension = 'webp';
    } else {
        return new WP_Error('invalid_type', 'Invalid image type', ['status' => 400]);
    }

    $filename = 'avatar_' . $current_user->ID . '_' . time() . '.' . $file_extension;

    // 上传目录
    $upload_dir = wp_upload_dir();
    $file_path = $upload_dir['path'] . '/' . $filename;
    $file_url = $upload_dir['url'] . '/' . $filename;

    // 保存文件
    file_put_contents($file_path, $body);

    // 添加到媒体库
    $attachment = [
        'post_mime_type' => $content_type,
        'post_title' => 'Avatar for user ' . $current_user->ID,
        'post_content' => '',
        'post_status' => 'inherit',
        'post_author' => $current_user->ID
    ];

    $attach_id = wp_insert_attachment($attachment, $file_path);

    // 生成缩略图
    require_once(ABSPATH . 'wp-admin/includes/image.php');
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
```

### 4. 获取用户头像端点

```php
/**
 * 获取用户头像端点
 * 端点: /wp-json/custom/v1/get-avatar
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

### 5. CORS 配置 (重要！)

```php
/**
 * 允许跨域请求 (CORS)
 * 用于 Headless 前端访问 WordPress API
 */
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
        return $value;
    });
}, 15);
```

---

## 🔄 迁移步骤

### 第一步：准备新环境

1. **安装 WordPress + WooCommerce**
   - 安装最新版本 WordPress
   - 安装 WooCommerce 插件
   - 完成 WooCommerce 设置向导

2. **安装必需插件**
   ```
   ✅ WPGraphQL
   ✅ JWT Authentication for WP REST API
   ✅ Advanced Custom Fields (可选)
   ```

3. **配置 JWT 认证**
   - 在 `wp-config.php` 添加:
     ```php
     define('JWT_AUTH_SECRET_KEY', 'your-top-secret-key-here-change-this');
     define('JWT_AUTH_CORS_ENABLE', true);
     ```

4. **添加自定义端点代码**
   - 复制上面的 PHP 代码到 `functions.php`
   - 或创建自定义插件

---

### 第二步：导出旧数据

#### 方法 A：使用 WooCommerce 导出工具
1. 旧 WordPress 后台 → WooCommerce → 产品
2. 点击 "导出" 按钮
3. 选择导出所有字段
4. **重要**: 在导出的 CSV 中，自定义字段会以 `meta:field_name` 格式显示

#### 方法 B：使用 WordPress 导出工具
1. 旧 WordPress 后台 → 工具 → 导出
2. 选择 "产品" 和 "所有内容"
3. 下载 XML 文件

#### 方法 C：数据库直接导出 (高级)
```sql
-- 导出产品
SELECT * FROM wp_posts WHERE post_type = 'product';

-- 导出产品 meta 数据
SELECT * FROM wp_postmeta WHERE post_id IN (
    SELECT ID FROM wp_posts WHERE post_type = 'product'
);

-- 导出产品分类
SELECT * FROM wp_terms
INNER JOIN wp_term_taxonomy ON wp_terms.term_id = wp_term_taxonomy.term_id
WHERE wp_term_taxonomy.taxonomy = 'product_cat';
```

---

### 第三步：迁移产品数据

#### 使用 WooCommerce 导入工具
1. 新 WordPress 后台 → WooCommerce → 产品
2. 点击 "导入" 按钮
3. 上传导出的 CSV 文件
4. 映射字段（确保自定义字段正确映射）
5. 运行导入

#### 手动验证每个产品的自定义字段
导入后，检查以下字段是否正确：
- `usage_ratings` - JSON 格式是否正确
- `product_features` - 数组是否完整
- `feature_cards` - 图片 URL 是否有效
- `specifications` - 规格是否显示
- `color_mapping` - 颜色是否正确映射

#### 使用脚本批量添加自定义字段 (推荐)
如果导入工具无法正确处理 JSON 字段，使用以下脚本：

```php
<?php
/**
 * 批量添加产品自定义字段
 * 将此脚本放在主题目录，然后访问该文件执行
 */

// 安全检查
if (!defined('ABSPATH')) {
    require_once('../../../wp-load.php');
}

if (!current_user_can('manage_options')) {
    die('Permission denied');
}

// 获取所有产品
$args = [
    'post_type' => 'product',
    'posts_per_page' => -1
];

$products = get_posts($args);

foreach ($products as $product) {
    $product_id = $product->ID;

    // 示例：添加使用场景评级
    $usage_ratings = [
        ['label' => 'Road', 'rating' => 4, 'icon' => 'road'],
        ['label' => 'Gravel', 'rating' => 5, 'icon' => 'gravel']
    ];
    update_post_meta($product_id, 'usage_ratings', json_encode($usage_ratings));

    // 示例：添加产品特点
    $features = ['Premium Quality', 'Fast Shipping', 'Eco-Friendly'];
    update_post_meta($product_id, 'product_features', json_encode($features));

    // 示例：添加规格
    $specs = [
        ['label' => 'Weight', 'value' => '1450g'],
        ['label' => 'Material', 'value' => 'Carbon Fiber']
    ];
    update_post_meta($product_id, 'specifications', json_encode($specs));

    echo "Updated product ID: $product_id - {$product->post_title}<br>";
}

echo "<br>Migration complete!";
?>
```

---

### 第四步：迁移图片

1. **使用 WooCommerce 导入** - 图片会自动从 URL 下载
2. **手动上传** - 如果自动下载失败，手动上传到媒体库
3. **批量处理** - 使用插件如 "Auto Upload Images"

---

### 第五步：迁移评论

#### 方法 A：WordPress 导入工具
1. 新 WordPress 后台 → 工具 → 导入
2. 选择 "WordPress"
3. 上传旧站的 XML 文件
4. 导入评论

#### 方法 B：数据库迁移
```sql
-- 从旧数据库导出评论
SELECT * FROM wp_comments WHERE comment_type = 'review';

-- 导入到新数据库（需要调整 comment_post_ID）
```

**注意**: 评论图片需要手动处理，因为它们存储在评论内容中。

---

### 第六步：迁移用户

1. 旧 WordPress → 工具 → 导出 → 用户
2. 新 WordPress → 工具 → 导入 → WordPress
3. 上传用户 XML 文件

**注意**: 用户自定义头像 (`custom_avatar_url`) 需要单独迁移：
```php
// 批量更新用户头像 URL
$users = get_users();
foreach ($users as $user) {
    $old_avatar = get_user_meta($user->ID, 'custom_avatar_url', true);
    if ($old_avatar) {
        // 替换旧域名为新域名
        $new_avatar = str_replace('old-domain.com', 'new-domain.com', $old_avatar);
        update_user_meta($user->ID, 'custom_avatar_url', $new_avatar);
    }
}
```

---

### 第七步：测试前端连接

1. **更新 `.env` 文件**
   ```env
   WOOCOMMERCE_URL=https://new-wordpress-site.com
   WOOCOMMERCE_CONSUMER_KEY=ck_new_key_here
   WOOCOMMERCE_CONSUMER_SECRET=cs_new_secret_here
   ```

2. **测试 API 连接**
   ```bash
   # 测试产品 API
   curl https://new-site.com/wp-json/wc/v3/products?consumer_key=ck_xxx&consumer_secret=cs_xxx

   # 测试 JWT Token
   curl -X POST https://new-site.com/wp-json/api/v1/token \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test123"}'
   ```

3. **测试前端页面**
   - 商品列表页: http://localhost:4321/shop
   - 商品详情页: http://localhost:4321/products/product-slug
   - 购物车: http://localhost:4321/cart
   - 结账: http://localhost:4321/checkout

---

## ✅ 验证清单

迁移完成后，逐一检查：

### 产品数据
- [ ] 所有产品已导入
- [ ] 产品图片正常显示
- [ ] 产品分类正确
- [ ] 产品价格正确
- [ ] 可变产品的变体正常工作
- [ ] 产品库存数量正确

### 自定义字段
- [ ] `usage_ratings` 显示正常
- [ ] `product_features` 标签显示
- [ ] `feature_cards` 卡片显示正常（图片、标题、描述）
- [ ] `specifications` 规格表格显示
- [ ] `gallery_images` 画廊图片显示
- [ ] `color_mapping` 颜色变体显示正确

### API 端点
- [ ] `/wp-json/wc/v3/products` 返回产品列表
- [ ] `/wp-json/api/v1/token` JWT 登录正常
- [ ] `/wp-json/custom/v1/upload-review-media` 图片上传正常
- [ ] `/wp-json/custom/v1/upload-avatar` 头像上传正常
- [ ] `/wp-json/custom/v1/get-avatar` 头像获取正常

### 前端功能
- [ ] 商品列表页加载正常
- [ ] 商品详情页显示完整
- [ ] 购物车添加/删除正常
- [ ] 结账流程完整
- [ ] Stripe 支付正常
- [ ] 用户登录/注册正常
- [ ] 评论提交正常（含图片上传）
- [ ] 用户头像上传正常

### Webhook
- [ ] Stripe Webhook 配置正确
- [ ] 支付成功后订单状态更新为 processing
- [ ] 支付失败后订单状态更新为 failed
- [ ] 退款后订单状态更新为 refunded

---

## 🚨 常见问题

### 1. 自定义字段导入后不显示
**原因**: JSON 格式错误或字段名不匹配

**解决方案**:
```php
// 检查字段值
$value = get_post_meta($product_id, 'usage_ratings', true);
var_dump($value);

// 确保是有效 JSON
$decoded = json_decode($value, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo 'Invalid JSON: ' . json_last_error_msg();
}
```

### 2. 图片无法显示
**原因**: 图片 URL 仍指向旧域名

**解决方案**:
```php
// 批量替换图片 URL
global $wpdb;
$wpdb->query("
    UPDATE {$wpdb->postmeta}
    SET meta_value = REPLACE(meta_value, 'old-domain.com', 'new-domain.com')
    WHERE meta_key LIKE '%image%' OR meta_key LIKE '%url%'
");
```

### 3. JWT Token 端点 404
**原因**: Rewrite rules 未刷新

**解决方案**:
1. WordPress 后台 → 设置 → 固定链接
2. 点击 "保存更改"（刷新 rewrite rules）

### 4. CORS 错误
**原因**: 跨域请求被阻止

**解决方案**: 确保添加了 CORS 配置代码（见上文）

---

## 📚 参考资源

- [WooCommerce REST API 文档](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [WPGraphQL 文档](https://www.wpgraphql.com/)
- [JWT Authentication Plugin](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/)
- [Stripe Webhooks 文档](https://stripe.com/docs/webhooks)

---

## 💡 建议

1. **备份旧数据库** - 在迁移前完整备份
2. **分批迁移** - 先迁移少量产品测试，确认无误后再全量迁移
3. **使用 ACF** - 如果产品很多，使用 ACF 插件可以简化自定义字段管理
4. **脚本化** - 编写 PHP 脚本批量处理自定义字段，比手动快得多
5. **测试环境** - 先在测试环境完成迁移，确认无误后再迁移到生产环境

---

## ✅ 完成！

如果按照本清单完成迁移，你的新 WooCommerce 站点应该能够完美支持现有的 Headless 前端！

有任何问题，请参考代码中的注释或查阅相关文档。
