# WooCommerce 自定义字段设置指南

本指南说明如何在WooCommerce产品中添加自定义字段，用于显示产品特点、使用场景评级、特性卡片轮播等信息。

## 方法1：使用插件（推荐 - 最简单）

### 安装插件：Advanced Custom Fields (ACF)

1. 在WordPress后台，进入 **插件 > 安装插件**
2. 搜索 "Advanced Custom Fields"
3. 安装并激活

### 创建字段组

1. 进入 **自定义字段 > 字段组 > 新增字段组**
2. 设置标题：`产品扩展信息`
3. 添加以下字段：

#### 字段1：产品特点列表
- **字段标签**: 产品特点
- **字段名称**: `product_features`
- **字段类型**: Repeater（重复字段）
- 子字段：
  - **字段标签**: 特点描述
  - **字段名称**: `feature`
  - **字段类型**: Text（文本）

#### 字段2：使用场景评级
- **字段标签**: 使用场景评级
- **字段名称**: `usage_ratings`
- **字段类型**: Repeater（重复字段）
- 子字段：
  - **字段标签**: 场景名称
  - **字段名称**: `label`
  - **字段类型**: Text（文本）
  - 示例：Road, Gravel, Mountain, City

  - **字段标签**: 评分（1-5）
  - **字段名称**: `rating`
  - **字段类型**: Number（数字）
  - 最小值：1，最大值：5

  - **字段标签**: 图标类型
  - **字段名称**: `icon`
  - **字段类型**: Select（下拉选择）
  - 选项：
    - `road` : Road（公路）
    - `gravel` : Gravel（砾石）
    - `mountain` : Mountain（山地）
    - `city` : City（城市）

#### 字段3：描述标题
- **字段标签**: 描述区块标题
- **字段名称**: `description_title`
- **字段类型**: Text（文本）
- **默认值**: Purpose & Design

#### 字段4：特性卡片轮播
- **字段标签**: 特性卡片
- **字段名称**: `feature_cards`
- **字段类型**: Repeater（重复字段）
- 子字段：
  - **字段标签**: 卡片标题
  - **字段名称**: `title`
  - **字段类型**: Text（文本）

  - **字段标签**: 卡片描述
  - **字段名称**: `description`
  - **字段类型**: Textarea（文本域）

  - **字段标签**: 卡片图片
  - **字段名称**: `image`
  - **字段类型**: Image（图片）
  - 返回格式：Image URL

#### 字段5：特性区块小标题
- **字段标签**: 特性区块小标题
- **字段名称**: `features_subheading`
- **字段类型**: Text（文本）
- **默认值**: Discover the benefits

#### 字段6：特性区块标题
- **字段标签**: 特性区块标题
- **字段名称**: `features_title`
- **字段类型**: Text（文本）
- **默认值**: Key Features

#### 字段7：Gallery图片集
- **字段标签**: Gallery图片集
- **字段名称**: `gallery_images`
- **字段类型**: Repeater（重复字段）或 Gallery（图库）
- 如果使用ACF的Gallery类型：
  - **返回格式**: Image URL
- 如果使用Repeater：
  - 子字段：
    - **字段标签**: 图片URL
    - **字段名称**: `image_url`
    - **字段类型**: Image（图片）
    - 返回格式：Image URL

#### 字段8：产品规格表
- **字段标签**: 产品规格
- **字段名称**: `specifications`
- **字段类型**: Repeater（重复字段）
- 子字段：
  - **字段标签**: 规格名称
  - **字段名称**: `label`
  - **字段类型**: Text（文本）

  - **字段标签**: 规格值
  - **字段名称**: `value`
  - **字段类型**: Textarea（文本域）或 Text（文本）

#### 字段9：规格图片
- **字段标签**: 规格图片
- **字段名称**: `specification_image`
- **字段类型**: Image（图片）
- **返回格式**: Image URL

4. 在**位置规则**中，设置：
   - 规则：**文章类型** 等于 **产品**
5. 保存字段组

---

## 方法2：手动添加自定义字段（无需插件）

### 在产品编辑页面添加

1. 进入 **产品 > 所有产品** > 选择一个产品编辑
2. 滚动到底部，找到 **自定义字段** 面板
3. 如果看不到，点击右上角 **屏幕选项** > 勾选 **自定义字段**

### 添加产品特点（product_features）

1. 点击 **添加自定义字段**
2. **名称**: `product_features`
3. **值**: 输入JSON格式
```json
[
  "Premium quality materials",
  "Durable construction",
  "Easy to maintain",
  "Professional grade performance"
]
```
4. 点击 **添加自定义字段**

### 添加使用场景评级（usage_ratings）

1. 点击 **添加自定义字段**
2. **名称**: `usage_ratings`
3. **值**: 输入JSON格式
```json
[
  {
    "label": "Road",
    "rating": 4,
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
4. 点击 **添加自定义字段**

### 添加描述标题（可选）

1. 点击 **添加自定义字段**
2. **名称**: `description_title`
3. **值**: `Purpose & Design` 或其他标题
4. 点击 **添加自定义字段**

### 添加特性卡片轮播（feature_cards）

1. 点击 **添加自定义字段**
2. **名称**: `feature_cards`
3. **值**: 输入JSON格式
```json
[
  {
    "title": "Wide Application",
    "description": "Road-OFF creates its own path – between asphalt and gravel. Designed for fast riding where classic road ends.",
    "image": "https://example.com/images/card1.jpg"
  },
  {
    "title": "32-55mm Tires",
    "description": "Works perfectly as dynamic allroad wheels on asphalt and light gravel, as well as solid set for demanding routes.",
    "image": "https://example.com/images/card2.jpg"
  },
  {
    "title": "Handmade for Years",
    "description": "All our wheels are made in Poland – by hand, by an experienced team that has been building wheels for years.",
    "image": "https://example.com/images/card3.jpg"
  }
]
```
4. 点击 **添加自定义字段**

### 添加特性区块标题（可选）

1. 点击 **添加自定义字段**
2. **名称**: `features_subheading`
3. **值**: `Discover the benefits` 或其他小标题
4. 点击 **添加自定义字段**

5. 点击 **添加自定义字段**
6. **名称**: `features_title`
7. **值**: `Key Features` 或其他标题
8. 点击 **添加自定义字段**

### 添加Gallery图片集（gallery_images）

1. 点击 **添加自定义字段**
2. **名称**: `gallery_images`
3. **值**: 输入JSON格式（图片URL数组）
```json
[
  "https://example.com/images/gallery1.jpg",
  "https://example.com/images/gallery2.jpg",
  "https://example.com/images/gallery3.jpg",
  "https://example.com/images/gallery4.jpg",
  "https://example.com/images/gallery5.jpg",
  "https://example.com/images/gallery6.jpg"
]
```
4. 点击 **添加自定义字段**

### 添加产品规格（specifications）

1. 点击 **添加自定义字段**
2. **名称**: `specifications`
3. **值**: 输入JSON格式（规格对象数组）
```json
[
  {
    "label": "Brand",
    "value": "LEEYOUNG"
  },
  {
    "label": "Material",
    "value": "Premium Steel"
  },
  {
    "label": "Load Capacity",
    "value": "500 kg"
  },
  {
    "label": "Dimensions",
    "value": "100 x 60 x 90 cm"
  },
  {
    "label": "Weight",
    "value": "25 kg"
  },
  {
    "label": "Warranty",
    "value": "2 years manufacturer warranty"
  }
]
```
4. 点击 **添加自定义字段**

### 添加规格图片（specification_image）

1. 点击 **添加自定义字段**
2. **名称**: `specification_image`
3. **值**: 输入图片URL
```
https://example.com/images/product-specification.jpg
```
4. 点击 **添加自定义字段**

---

## 方法3：使用代码片段（高级用户）

### 安装 Code Snippets 插件

1. 安装并激活 **Code Snippets** 插件
2. 进入 **Snippets > Add New**
3. 添加以下代码：

```php
<?php
// 在产品编辑页面添加自定义字段
add_action('woocommerce_product_options_general_product_data', 'add_custom_product_fields');

function add_custom_product_fields() {
    global $post;

    echo '<div class="options_group">';

    // 描述标题
    woocommerce_wp_text_input(array(
        'id' => '_description_title',
        'label' => '描述区块标题',
        'placeholder' => 'Purpose & Design',
        'desc_tip' => true,
        'description' => '显示在产品描述区块的标题'
    ));

    echo '</div>';
}

// 保存自定义字段
add_action('woocommerce_process_product_meta', 'save_custom_product_fields');

function save_custom_product_fields($post_id) {
    $description_title = isset($_POST['_description_title']) ? sanitize_text_field($_POST['_description_title']) : '';
    update_post_meta($post_id, '_description_title', $description_title);
}
```

---

## 字段说明

### 1. product_features（产品特点）
- **类型**: JSON数组
- **格式**: 字符串数组
- **示例**:
```json
[
  "Premium quality materials",
  "Durable construction",
  "Easy to maintain"
]
```

### 2. usage_ratings（使用场景评级）
- **类型**: JSON数组
- **格式**: 对象数组
- **字段**:
  - `label`: 场景名称（字符串）
  - `rating`: 评分1-5（数字）
  - `icon`: 图标类型（可选，字符串）
    - 可用值: `road`, `gravel`, `mountain`, `city`
    - 留空则显示默认图标
- **示例**:
```json
[
  {
    "label": "Road",
    "rating": 4,
    "icon": "road"
  },
  {
    "label": "Gravel",
    "rating": 5,
    "icon": "gravel"
  }
]
```

### 3. description_title（描述标题）
- **类型**: 文本字符串
- **默认值**: "Purpose & Design"
- **示例**: "Product Overview", "适用场景", "Przeznaczenie"

### 4. feature_cards（特性卡片轮播）
- **类型**: JSON数组
- **格式**: 对象数组
- **字段**:
  - `title`: 卡片标题（字符串）
  - `description`: 卡片描述（字符串）
  - `image`: 卡片图片URL（字符串）
- **示例**:
```json
[
  {
    "title": "Wide Application",
    "description": "Road-OFF creates its own path – between asphalt and gravel. Designed for fast riding where classic road ends.",
    "image": "https://example.com/images/wide-application.jpg"
  },
  {
    "title": "32-55mm Tires",
    "description": "Works perfectly as dynamic allroad wheels on asphalt and light gravel, as well as solid set for demanding routes.",
    "image": "https://example.com/images/tires.jpg"
  },
  {
    "title": "Handmade for Years",
    "description": "All our wheels are made in Poland – by hand, by an experienced team.",
    "image": "https://example.com/images/handmade.jpg"
  }
]
```

### 5. features_subheading（特性区块小标题）
- **类型**: 文本字符串
- **默认值**: "Discover the benefits"
- **示例**: "Why Choose Us", "产品优势", "Poznaj zalety"

### 6. features_title（特性区块标题）
- **类型**: 文本字符串
- **默认值**: "Key Features"
- **示例**: "Main Benefits", "核心特性", "Najważniejsze cechy"

### 7. gallery_images（Gallery图片集）
- **类型**: JSON数组
- **格式**: 字符串数组（图片URL）
- **说明**: 用于产品详情页Gallery区块显示的额外图片集，与产品主图片分开
- **示例**:
```json
[
  "https://example.com/images/gallery1.jpg",
  "https://example.com/images/gallery2.jpg",
  "https://example.com/images/gallery3.jpg",
  "https://example.com/images/gallery4.jpg",
  "https://example.com/images/gallery5.jpg"
]
```

### 8. specifications（产品规格表）
- **类型**: JSON数组
- **格式**: 对象数组
- **字段**:
  - `label`: 规格名称（字符串）
  - `value`: 规格值（字符串或字符串数组）
- **说明**: 用于产品详情页Technical Specification区块显示的技术参数
- **示例**:
```json
[
  {
    "label": "Brand",
    "value": "EVANLITE®"
  },
  {
    "label": "Material",
    "value": "Carbon"
  },
  {
    "label": "Load Capacity",
    "value": "120 kg (user, bike, equipment)"
  },
  {
    "label": "Included",
    "value": ["Complete wheelset in chosen configuration", "Warranty card and manual", "Rim tapes"]
  }
]
```

### 9. specification_image（规格图片）
- **类型**: 文本字符串（图片URL）
- **说明**: 在规格表格旁边显示的产品示意图或技术图
- **示例**: `"https://example.com/images/product-specification.png"`

---

## 显示逻辑

1. **产品特点**: 如果没有设置 `product_features`，将显示默认的4条特点
2. **使用场景评级**: 只有设置了 `usage_ratings` 才会显示评级区块
3. **描述标题**: 如果没有设置 `description_title`，默认显示 "Purpose & Design"
4. **特性卡片轮播**: 只有设置了 `feature_cards` 才会显示轮播区块
5. **特性区块标题**:
   - `features_subheading` 默认显示 "Discover the benefits"
   - `features_title` 默认显示 "Key Features"
6. **Gallery图片集**: 如果没有设置 `gallery_images`，将显示默认的8张假数据图片；设置后只显示Gallery区块
7. **产品规格表**: 如果没有设置 `specifications`，将显示默认的10条规格数据；设置后显示Technical Specification区块
8. **规格图片**: `specification_image` 可选，如果设置则显示在规格表格旁边

---

## 示例：完整的产品设置

### 在产品编辑页面

**产品名称**: ROAD-OFF Professional Wheels

**简短描述**:
```
Evanlite model ROAD-OFF 是专为公路和砾石路设计的全能轮组。
结合了公路的空气动力学和砾石的耐用性。
```

**自定义字段**:

1. `product_features`:
```json
[
  "Universal 45mm rim",
  "25mm internal width",
  "For 32-55c tires",
  "Works on terrain and road"
]
```

2. `usage_ratings`:
```json
[
  {
    "label": "Road",
    "rating": 4,
    "icon": "road"
  },
  {
    "label": "Gravel",
    "rating": 5,
    "icon": "gravel"
  }
]
```

3. `description_title`:
```
Purpose & Application
```

4. `feature_cards`:
```json
[
  {
    "title": "Szerokie zastosowanie",
    "description": "Road-OFF wyznaczają własną trasę – między asfaltem a szutrem. Zaprojektowane do szybkiej jazdy tam, gdzie kończy się klasyczna szosa.",
    "image": "https://evanlite.com/cdn/shop/files/blro1.png"
  },
  {
    "title": "Opony 32 - 55 mm",
    "description": "Opona szosowa czy szeroka gravelowa? Road-OFF sprawdzają się zarówno jako dynamiczne koła szosowe typu allroad na asfalt i lekki szuter.",
    "image": "https://evanlite.com/cdn/shop/files/blro3.png"
  },
  {
    "title": "Ręczna robota od lat",
    "description": "Wszystkie nasze koła powstają w Polsce – ręcznie, przez doświadczony zespół, który od lat zajmuje się tylko jednym: budową kół.",
    "image": "https://evanlite.com/cdn/shop/files/handmade.jpg"
  }
]
```

5. `features_subheading`:
```
Poznaj zalety
```

6. `features_title`:
```
Najważniejsze cechy
```

7. `gallery_images`:
```json
[
  "https://evanlite.com/cdn/shop/files/inflite-evanlite-canyon.jpg",
  "https://evanlite.com/cdn/shop/files/DSC02352-scaled.jpg",
  "https://evanlite.com/cdn/shop/files/rosrof.jpg",
  "https://evanlite.com/cdn/shop/files/canyon-evanlite-gravel.jpg",
  "https://evanlite.com/cdn/shop/files/esker-roadoff.jpg",
  "https://evanlite.com/cdn/shop/files/road-off-rainbow3.jpg"
]
```

---

## 常见问题

### Q: 如何修改已有产品的自定义字段？
A: 在产品编辑页面，找到对应的自定义字段，点击 **编辑** 按钮修改值即可。

### Q: JSON格式错误怎么办？
A: 确保：
- 使用双引号 `"` 而不是单引号 `'`
- 数组元素之间用逗号分隔
- 最后一个元素后面不要加逗号
- 可以使用在线JSON验证工具检查格式

### Q: 能否在不同产品中使用不同的图标？
A: 可以！每个产品的 `usage_ratings` 都是独立的，可以设置不同的场景和图标。

### Q: 如果不想显示使用场景评级怎么办？
A: 不添加 `usage_ratings` 字段，或设置为空数组 `[]` 即可。

---

## 建议的工作流程

1. **使用ACF插件**（最简单）
   - 提供可视化界面
   - 不需要写JSON
   - 适合非技术人员

2. **手动添加JSON**（灵活）
   - 完全控制数据格式
   - 适合技术人员
   - 可以批量复制粘贴

3. **使用代码片段**（高级）
   - 自定义UI界面
   - 可以添加验证逻辑
   - 适合开发者

选择最适合你的方法即可！
