/**
 * 自定义 WooCommerce 支付页面样式
 * 将此代码添加到 WordPress 主题的 functions.php 或创建自定义插件
 */

// 1. 添加 CORS 支持（必需）
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $origin = get_http_origin();
        $allowed_origins = [
            'https://your-frontend-domain.com', // 替换为你的前端域名
            'https://your-frontend.pages.dev',   // Cloudflare Pages域名
            'http://localhost:4321',              // 开发环境
            'http://localhost:3000',
        ];

        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, Cart-Token, X-WC-Store-API-Nonce');
        }

        if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
            status_header(200);
            exit();
        }

        return $value;
    });
}, 15);

// 2. 启用 Store API Cart session（必需）
add_filter('woocommerce_store_api_disable_nonce_check', '__return_true');

// 3. 美化支付页面样式
add_action('wp_head', function() {
    // 只在支付页面加载样式
    if (is_checkout() || is_wc_endpoint_url('order-pay')) {
        ?>
        <style>
        /* 重置和基础样式 */
        body.woocommerce-checkout,
        body.woocommerce-order-pay {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
            background: #fafafa;
            color: #333;
        }

        /* 主容器 */
        .woocommerce {
            max-width: 800px;
            margin: 2rem auto;
            padding: 0 1.5rem;
        }

        .woocommerce-checkout,
        #order_review {
            background: #fff;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 2.5rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        /* 标题样式 */
        .woocommerce h3,
        .woocommerce h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #000;
            margin-bottom: 1.5rem;
            letter-spacing: -0.01em;
        }

        /* 订单详情表格 */
        .woocommerce-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2rem;
        }

        .woocommerce-table th,
        .woocommerce-table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #e5e5e5;
        }

        .woocommerce-table th {
            font-weight: 600;
            color: #666;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .woocommerce-table .order-total th,
        .woocommerce-table .order-total td {
            font-size: 1.125rem;
            font-weight: 700;
            border-top: 2px solid #000;
            padding-top: 1.5rem;
        }

        /* 支付方式 */
        .woocommerce-checkout-payment {
            background: #fff;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 1.5rem;
            margin-top: 2rem;
        }

        .wc_payment_methods {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .wc_payment_method {
            border: 2px solid #e5e5e5;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            transition: all 0.3s;
        }

        .wc_payment_method input[type="radio"]:checked + label {
            font-weight: 600;
        }

        .wc_payment_method.payment_method_selected {
            border-color: #000;
            background: #fafafa;
        }

        .wc_payment_method label {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
            font-size: 0.9375rem;
        }

        .wc_payment_method input[type="radio"] {
            width: 20px;
            height: 20px;
            cursor: pointer;
        }

        /* Stripe Elements 样式 */
        .wc-stripe-elements-field,
        .wc-stripe-upe-element {
            padding: 1rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: #fff;
            margin-bottom: 1rem;
            transition: border-color 0.2s;
        }

        .wc-stripe-elements-field:focus-within,
        .wc-stripe-upe-element:focus-within {
            border-color: #000;
            box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
        }

        /* 支付按钮 */
        #place_order,
        .woocommerce-button,
        .button.alt {
            width: 100%;
            padding: 1.25rem;
            background: #000;
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            letter-spacing: 0.02em;
            text-transform: uppercase;
        }

        #place_order:hover,
        .woocommerce-button:hover,
        .button.alt:hover {
            background: #333;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        #place_order:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* 加载状态 */
        .blockUI.blockOverlay {
            background: rgba(255, 255, 255, 0.9) !important;
        }

        .blockUI.blockMsg {
            border: none !important;
            background: #000 !important;
            color: #fff !important;
            border-radius: 8px !important;
            padding: 1.5rem 2rem !important;
            font-size: 0.9375rem !important;
        }

        /* 错误提示 */
        .woocommerce-error,
        .woocommerce-notice {
            background: #fee;
            border: 1px solid #fcc;
            border-left: 4px solid #c00;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            margin-bottom: 1.5rem;
            color: #c00;
        }

        .woocommerce-message {
            background: #efe;
            border: 1px solid #cfc;
            border-left: 4px solid #4caf50;
            color: #2d5016;
        }

        /* 订单详情 */
        .woocommerce-order-details {
            background: #f9f9f9;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 1.5rem;
            margin-top: 2rem;
        }

        /* 地址信息 */
        .woocommerce-customer-details address {
            padding: 1rem;
            background: #f9f9f9;
            border-radius: 6px;
            border: 1px solid #e5e5e5;
            font-style: normal;
            line-height: 1.6;
        }

        /* 响应式 */
        @media (max-width: 768px) {
            .woocommerce {
                padding: 0 1rem;
            }

            .woocommerce-checkout,
            #order_review {
                padding: 1.5rem;
                margin: 1rem 0;
            }

            .woocommerce h3,
            .woocommerce h2 {
                font-size: 1.1rem;
            }

            .woocommerce-table th,
            .woocommerce-table td {
                padding: 0.75rem 0.5rem;
                font-size: 0.875rem;
            }
        }

        /* 隐藏不需要的元素 */
        .woocommerce-privacy-policy-text {
            font-size: 0.8rem;
            color: #999;
            margin-top: 1rem;
        }

        /* Logo 区域（可选）*/
        .site-header {
            text-align: center;
            padding: 2rem 0;
            border-bottom: 1px solid #e5e5e5;
            margin-bottom: 2rem;
        }

        .site-header .site-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #000;
            text-decoration: none;
        }
        </style>
        <?php
    }
});

// 4. 自定义支付页面模板（可选，更高级的定制）
add_filter('woocommerce_locate_template', function($template, $template_name) {
    // 如果想完全自定义支付页面模板，可以在这里重定向到自定义模板
    // 例如：重定向 checkout/payment.php 到你的自定义模板
    return $template;
}, 10, 2);

// 5. 在支付页面添加自定义logo（可选）
add_action('woocommerce_before_checkout_form', function() {
    ?>
    <div class="site-header">
        <a href="<?php echo home_url(); ?>" class="site-title">
            IMAM HIJAB
        </a>
    </div>
    <?php
}, 5);

// 6. 移除不需要的字段（可选）
add_filter('woocommerce_checkout_fields', function($fields) {
    // 如果这些字段已经在前端收集，可以在这里隐藏
    // 例如：unset($fields['billing']['billing_company']);
    return $fields;
});

// 7. 自定义支付成功后的跳转（重要！）
add_action('woocommerce_thankyou', function($order_id) {
    // 支付成功后跳转回你的前端
    if (!$order_id) return;

    $order = wc_get_order($order_id);
    if (!$order) return;

    // 如果是从你的前端来的订单，跳转回前端成功页面
    $frontend_url = 'https://your-frontend-domain.com/checkout/success?order_id=' . $order_id;

    // 使用 JavaScript 跳转（避免多次重定向）
    ?>
    <script>
    window.location.href = '<?php echo esc_url($frontend_url); ?>';
    </script>
    <?php
}, 1);
