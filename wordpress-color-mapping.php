<?php
/**
 * Plugin Name: Product Color Mapping Manager
 * Description: 为 WooCommerce 产品添加颜色映射管理功能，支持颜色代码和图片上传
 * Version: 1.0
 * Author: LEEYOUNG
 */

// 防止直接访问
if (!defined('ABSPATH')) {
    exit;
}

// 只在产品编辑页面加载资源
add_action('admin_enqueue_scripts', 'color_mapping_enqueue_scripts');
function color_mapping_enqueue_scripts($hook) {
    // 只在产品编辑页面加载
    if ('post.php' !== $hook && 'post-new.php' !== $hook) {
        return;
    }

    global $post;
    if (!$post || $post->post_type !== 'product') {
        return;
    }

    // 确保媒体库脚本已加载
    wp_enqueue_media();
}

// 添加产品颜色映射管理元框
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

// 渲染元框内容
function render_color_mapping_meta_box($post) {
    // 获取现有的颜色映射数据
    $color_mapping = get_post_meta($post->ID, 'color_mapping', true);
    $color_data = array();

    if (!empty($color_mapping)) {
        $color_data = json_decode($color_mapping, true);
        if (!is_array($color_data)) {
            $color_data = array();
        }
    }

    // 获取产品的颜色属性选项
    $product = wc_get_product($post->ID);
    $color_options = array();

    if ($product && $product->is_type('variable')) {
        $attributes = $product->get_attributes();
        foreach ($attributes as $attribute) {
            $attr_name = $attribute->get_name();
            // 查找颜色相关的属性（支持中英文）
            if (stripos($attr_name, 'color') !== false || stripos($attr_name, '颜色') !== false || stripos($attr_name, 'colour') !== false) {
                if ($attribute->is_taxonomy()) {
                    $terms = $attribute->get_terms();
                    foreach ($terms as $term) {
                        $color_options[] = $term->name;
                    }
                } else {
                    $color_options = $attribute->get_options();
                }
                break;
            }
        }
    }

    wp_nonce_field('save_color_mapping', 'color_mapping_nonce');
    ?>

    <div class="color-mapping-widget">
        <?php if (empty($color_options)): ?>
            <p style="color: #d63638; font-size: 12px;">
                ⚠️ 未检测到颜色属性。<br>
                请先添加颜色属性（属性名称包含 "color" 或 "颜色"）。
            </p>
        <?php else: ?>
            <p style="margin-bottom: 10px; font-size: 12px;">为每个颜色设置色卡：</p>

            <div class="color-mapping-items">
                <?php foreach ($color_options as $color_name):
                    $color_name = trim($color_name);
                    $current_value = isset($color_data[$color_name]) ? $color_data[$color_name] : '';
                    $is_image = !empty($current_value) && (strpos($current_value, 'http') === 0 || strpos($current_value, '/') === 0);
                    $type = $is_image ? 'image' : 'color';
                    $color_code = !$is_image && !empty($current_value) ? $current_value : '#000000';
                    $image_url = $is_image ? $current_value : '';
                ?>
                <div class="color-item" data-color="<?php echo esc_attr($color_name); ?>">
                    <div class="color-item-header">
                        <strong><?php echo esc_html($color_name); ?></strong>
                    </div>

                    <div class="color-item-type">
                        <label style="margin-right: 10px;">
                            <input type="radio" name="type_<?php echo esc_attr($color_name); ?>" value="color" <?php checked($type, 'color'); ?>>
                            颜色
                        </label>
                        <label>
                            <input type="radio" name="type_<?php echo esc_attr($color_name); ?>" value="image" <?php checked($type, 'image'); ?>>
                            图片
                        </label>
                    </div>

                    <div class="color-code-section" style="<?php echo $type === 'image' ? 'display:none;' : ''; ?>">
                        <input type="color" class="color-picker-input" value="<?php echo esc_attr($color_code); ?>" style="width: 100%; height: 30px; margin-top: 5px;">
                        <input type="text" class="color-hex-input" value="<?php echo esc_attr($color_code); ?>" placeholder="#000000" style="width: 100%; margin-top: 5px;">
                    </div>

                    <div class="color-image-section" style="<?php echo $type === 'color' ? 'display:none;' : ''; ?>">
                        <input type="hidden" class="color-image-value" value="<?php echo esc_attr($image_url); ?>">
                        <div style="margin-top: 5px;">
                            <?php if ($image_url): ?>
                                <img src="<?php echo esc_url($image_url); ?>" class="color-preview-img" style="width: 50px; height: 50px; border: 1px solid #ddd; border-radius: 4px; object-fit: cover; display: block; margin-bottom: 5px;">
                            <?php endif; ?>
                            <button type="button" class="button button-small upload-color-img">选择图片</button>
                            <?php if ($image_url): ?>
                                <button type="button" class="button button-small remove-color-img" style="margin-left: 5px;">移除</button>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>

            <input type="hidden" id="color_mapping_data" name="color_mapping_data" value="">
        <?php endif; ?>
    </div>

    <style>
        .color-mapping-widget {
            font-size: 13px;
        }
        .color-mapping-items {
            max-height: 400px;
            overflow-y: auto;
        }
        .color-item {
            padding: 10px;
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .color-item-header {
            margin-bottom: 8px;
        }
        .color-item-type {
            margin-bottom: 8px;
            font-size: 12px;
        }
        .color-item-type label {
            font-weight: normal;
        }
    </style>

    <script>
    (function($) {
        'use strict';

        // 只在颜色映射元框内执行
        var $widget = $('.color-mapping-widget');
        if (!$widget.length) return;

        // 切换类型
        $widget.on('change', 'input[type="radio"]', function() {
            var $item = $(this).closest('.color-item');
            var type = $(this).val();

            if (type === 'color') {
                $item.find('.color-code-section').show();
                $item.find('.color-image-section').hide();
            } else {
                $item.find('.color-code-section').hide();
                $item.find('.color-image-section').show();
            }
        });

        // 颜色选择器
        $widget.on('change', '.color-picker-input', function() {
            $(this).siblings('.color-hex-input').val($(this).val());
        });

        $widget.on('input', '.color-hex-input', function() {
            var val = $(this).val();
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                $(this).siblings('.color-picker-input').val(val);
            }
        });

        // 图片上传
        $widget.on('click', '.upload-color-img', function(e) {
            e.preventDefault();

            var $btn = $(this);
            var $section = $btn.closest('.color-image-section');

            var frame = wp.media({
                title: '选择颜色图片',
                button: { text: '使用此图片' },
                multiple: false
            });

            frame.on('select', function() {
                var attachment = frame.state().get('selection').first().toJSON();
                $section.find('.color-image-value').val(attachment.url);

                var $img = $section.find('.color-preview-img');
                if ($img.length) {
                    $img.attr('src', attachment.url);
                } else {
                    $btn.before('<img src="' + attachment.url + '" class="color-preview-img" style="width: 50px; height: 50px; border: 1px solid #ddd; border-radius: 4px; object-fit: cover; display: block; margin-bottom: 5px;">');
                }

                if (!$section.find('.remove-color-img').length) {
                    $btn.after('<button type="button" class="button button-small remove-color-img" style="margin-left: 5px;">移除</button>');
                }
            });

            frame.open();
        });

        // 移除图片
        $widget.on('click', '.remove-color-img', function(e) {
            e.preventDefault();

            var $section = $(this).closest('.color-image-section');
            $section.find('.color-image-value').val('');
            $section.find('.color-preview-img').remove();
            $(this).remove();
        });

        // 保存时收集数据
        $('#post').on('submit.colorMapping', function() {
            var data = {};

            $widget.find('.color-item').each(function() {
                var name = $(this).data('color');
                var type = $(this).find('input[type="radio"]:checked').val();
                var value = '';

                if (type === 'color') {
                    value = $(this).find('.color-hex-input').val();
                } else {
                    value = $(this).find('.color-image-value').val();
                }

                if (value) {
                    data[name] = value;
                }
            });

            $('#color_mapping_data').val(JSON.stringify(data));
        });
    })(jQuery);
    </script>
    <?php
}

// 保存颜色映射数据
add_action('save_post_product', 'save_color_mapping_meta_box', 10, 1);
function save_color_mapping_meta_box($post_id) {
    // 验证 nonce
    if (!isset($_POST['color_mapping_nonce']) || !wp_verify_nonce($_POST['color_mapping_nonce'], 'save_color_mapping')) {
        return;
    }

    // 检查自动保存
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }

    // 检查权限
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    // 保存数据
    if (isset($_POST['color_mapping_data'])) {
        $color_mapping = sanitize_text_field($_POST['color_mapping_data']);
        update_post_meta($post_id, 'color_mapping', $color_mapping);
    }
}
