<?php
/**
 * Plugin Name:       弃单挽回 - 测试版（邮件发送）
 * Description:       测试版：仅发送邮件给未支付订单，邮件中包含10%折扣码
 * Version:           1.0.0
 * Author:            Claude
 * Text Domain:       abandoned-cart-recovery-test
 */

if (!defined('ABSPATH')) {
    exit;
}

// 注册定时任务（每小时检查一次）
add_action('init', 'arc_init_cron');

function arc_init_cron() {
    if (!wp_next_scheduled('arc_send_reminders')) {
        wp_schedule_event(time(), 'hourly', 'arc_send_reminders');
    }
}

// 定时任务：每小时执行一次
add_action('arc_send_reminders', 'arc_send_abandoned_reminders');

function arc_send_abandoned_reminders() {
    $statuses = ['pending', 'failed', 'on-hold'];

    $orders = wc_get_orders([
        'status'    => $statuses,
        'limit'     => -1,
        'date_created' => '>' . (time() - 48 * 3600), // 只处理最近48小时内的订单（避免数据过多）
    ]);

    foreach ($orders as $order) {
        $order_id = $order->get_id();
        $created  = $order->get_date_created()->getTimestamp();
        $now      = time();

        $hours_ago = ($now - $created) / 3600;

        // 1小时后（48-72小时）
        if ($hours_ago >= 48 && $hours_ago < 72) {
            arc_send_discount_email($order_id, '10%', '48-72小时');
        }
        // 8小时后（240-264小时）
        elseif ($hours_ago >= 240 && $hours_ago < 264) {
            arc_send_discount_email($order_id, '16%', '240-264小时');
        }
        // 16小时后（576-600小时）
        elseif ($hours_ago >= 576 && $hours_ago < 600) {
            arc_send_discount_email($order_id, '20%', '576-600小时');
        }
    }
}

function arc_send_discount_email($order_id, $discount_pct, $time_label) {
    $order = wc_get_order($order_id);
    if (!$order || $order->get_status() !== 'pending') {
        return;
    }

    // 生成折扣码（示例：LEEYOUNG10-ABC12345）
    $prefix = 'LEEYOUNG' . $discount_pct;
    $code = $prefix . '-' . strtoupper(substr(md5($order_id . time()), 0, 8));

    $subject = "您的订单还有机会！领取{$discount_pct}折扣码挽回";

    $message = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h2>亲爱的客户，您的订单还有挽回机会！</h2>
            <p>您的订单 <strong>#{$order_id}</strong> 已经超过 <strong>{$time_label}</strong> 未支付。</p>

            <p>现在输入以下折扣码即可获得 <strong>{$discount_pct}</strong> 折扣：</p>

            <p style='font-size: 26px; font-weight: bold; background: #f8f9fa; padding: 20px; text-align: center; border: 2px solid #000; letter-spacing: 3px;'>
                {$code}
            </p>

            <p>有效期：24小时内 • 每单仅限使用一次</p>

            <p>支付成功后订单将自动恢复正常。</p>
        </div>
    ";

    $mailer = WC()->mailer();
    $mailer->send(
        $order->get_billing_email(),
        $subject,
        $message,
        ['html']
    );

    // 记录日志
    error_log("弃单挽回邮件已发送 - 订单ID: {$order_id} | 折扣: {$discount_pct}% | 时间: {$time_label}");
}

add_action('woocommerce_order_status_changed', 'arc_check_new_pending_order', 10, 3);
function arc_check_new_pending_order($order_id, $old_status, $new_status) {
    if ($new_status === 'pending' && in_array($old_status, ['processing', 'on-hold', 'completed'])) {
        $order = wc_get_order($order_id);
        $created = $order->get_date_created()->getTimestamp();
        $now = time();
        $hours_ago = ($now - $created) / 3600;

        // 如果订单刚变为未支付状态，且已经超过1小时，就立即发送10%折扣
        if ($hours_ago >= 48) {
            arc_send_discount_email($order_id, '10%', '立即发送');
        }
    }
}

/**
 * 手动触发邮件发送（调试用）
 */
add_action('admin_menu', 'arc_add_manual_send_menu');
function arc_add_manual_send_menu() {
    add_submenu_page(
        'woocommerce',
        '手动发送挽回邮件',
        '手动发送挽回邮件',
        'manage_options',
        'arc-manual-send',
        'arc_manual_send_page'
    );
}

function arc_manual_send_page() {
    if (!current_user_can('manage_options')) {
        wp_die('无权限');
    }

    $email = isset($_GET['email']) ? sanitize_email($_GET['email']) : '';

    if ($email && isset($_GET['discount_pct']) && isset($_GET['time_label'])) {
        $discount_pct = sanitize_text_field($_GET['discount_pct']);
        $time_label = sanitize_text_field($_GET['time_label']);
        arc_send_test_discount_email($email, $discount_pct, $time_label);
        echo '<div class="updated"><p>测试挽回邮件已发送！</p></div>';
        return;
    }

    echo '<div class="wrap">';
    echo '<h1>手动发送挽回邮件 - 测试版</h1>';
    echo '<p style="margin-bottom:20px;">输入接收邮箱地址，点击下方按钮发送测试邮件（无需订单）</p>';
    echo '<input type="email" id="test_email" value="your@email.com" style="width:380px;padding:10px;font-size:16px;">';
    echo '<button onclick="send48hTest()" class="button button-primary" style="margin-left:10px;">48小时 - 10% 折扣</button>';
    echo '<button onclick="send240hTest()" class="button button-primary" style="margin-left:10px;">240小时 - 16% 折扣</button>';
    echo '<button onclick="send576hTest()" class="button button-primary" style="margin-left:10px;">576小时 - 20% 折扣</button>';
    echo '<script>';
    echo 'function send48hTest() { sendTest("10%", "48-72小时"); }';
    echo 'function send240hTest() { sendTest("16%", "240-264小时"); }';
    echo 'function send576hTest() { sendTest("20%", "576-600小时"); }';
    echo 'function sendTest(discountPct, timeLabel) {';
    echo '  const email = document.getElementById("test_email").value;';
    echo '  if (!isValidEmail(email)) {';
    echo '    alert("请输入有效的邮箱地址");';
    echo '    return;';
    echo '  }';
    echo '  const url = new URL(window.location.href);';
    echo '  url.searchParams.set("email", email);';
    echo '  url.searchParams.set("discount_pct", discountPct);';
    echo '  url.searchParams.set("time_label", timeLabel);';
    echo '  window.location.href = url.toString();';
    echo '}';
    echo 'function isValidEmail(email) {';
    echo '  return /^\\S+@\\S+\\.\\S+$/.test(email);';
    echo '}';
    echo '</script>';
    echo '</div>';
}
?>
```