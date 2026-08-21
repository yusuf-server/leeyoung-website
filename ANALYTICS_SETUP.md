# WordPress 分析埋点系统 - 后端配置

将以下代码添加到 WordPress 主题的 `functions.php` 或创建自定义插件。

## 1. 创建数据库表

```php
<?php
/**
 * 创建分析数据表
 */
function leeyoung_create_analytics_tables() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();

    // 访问事件表
    $table_events = $wpdb->prefix . 'analytics_events';
    $sql_events = "CREATE TABLE IF NOT EXISTS $table_events (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        event_type varchar(50) NOT NULL,
        session_id varchar(100) NOT NULL,
        user_id bigint(20) DEFAULT NULL,
        page_url text NOT NULL,
        referrer text,
        device_type varchar(20),
        ip_address varchar(50),
        country varchar(10),
        state varchar(50),
        city varchar(50),
        user_agent text,
        event_data longtext,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY session_id (session_id),
        KEY event_type (event_type),
        KEY user_id (user_id),
        KEY created_at (created_at),
        KEY device_type (device_type),
        KEY country (country)
    ) $charset_collate;";

    // 会话表（用于去重真人访客）
    $table_sessions = $wpdb->prefix . 'analytics_sessions';
    $sql_sessions = "CREATE TABLE IF NOT EXISTS $table_sessions (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        session_id varchar(100) NOT NULL UNIQUE,
        user_id bigint(20) DEFAULT NULL,
        first_page text,
        landing_page text,
        referrer text,
        referrer_domain varchar(255),
        utm_source varchar(100),
        utm_medium varchar(100),
        utm_campaign varchar(100),
        device_type varchar(20),
        ip_address varchar(50),
        country varchar(10),
        state varchar(50),
        city varchar(50),
        is_bot tinyint(1) DEFAULT 0,
        events_count int DEFAULT 0,
        page_views int DEFAULT 0,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        last_activity datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY session_id (session_id),
        KEY user_id (user_id),
        KEY country (country),
        KEY device_type (device_type),
        KEY is_bot (is_bot),
        KEY created_at (created_at)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql_events);
    dbDelta($sql_sessions);
}

// 在主题激活或插件启用时创建表
add_action('after_setup_theme', 'leeyoung_create_analytics_tables');
```

## 2. 创建REST API端点

```php
<?php
/**
 * 注册分析API端点
 */
add_action('rest_api_init', function () {
    register_rest_route('analytics/v1', '/track', array(
        'methods' => 'POST',
        'callback' => 'leeyoung_handle_analytics_event',
        'permission_callback' => '__return_true', // 公开访问
    ));
});

/**
 * 处理分析事件
 */
function leeyoung_handle_analytics_event($request) {
    global $wpdb;

    $params = $request->get_json_params();

    // 验证必需字段
    if (empty($params['event_type']) || empty($params['session_id'])) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Missing required fields'
        ], 400);
    }

    // 获取IP和User Agent
    $ip = $params['ip_address'] ?? $_SERVER['REMOTE_ADDR'];
    $user_agent = $params['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'];
    $country = $params['country'] ?? '';

    // 简单的Bot检测
    $is_bot = leeyoung_detect_bot($user_agent);

    // 解析referrer获取来源
    $referrer = $params['referrer'] ?? '';
    $referrer_domain = '';
    $utm_source = '';
    $utm_medium = '';
    $utm_campaign = '';

    if ($referrer && $referrer !== 'direct') {
        $parsed = parse_url($referrer);
        $referrer_domain = $parsed['host'] ?? '';

        // 解析UTM参数
        if (isset($parsed['query'])) {
            parse_str($parsed['query'], $query_params);
            $utm_source = $query_params['utm_source'] ?? '';
            $utm_medium = $query_params['utm_medium'] ?? '';
            $utm_campaign = $query_params['utm_campaign'] ?? '';
        }
    }

    // 插入或更新会话
    $session_data = array(
        'session_id' => $params['session_id'],
        'user_id' => $params['user_id'] ?? null,
        'landing_page' => $params['page_url'],
        'referrer' => $referrer,
        'referrer_domain' => $referrer_domain,
        'utm_source' => $utm_source,
        'utm_medium' => $utm_medium,
        'utm_campaign' => $utm_campaign,
        'device_type' => $params['device_type'] ?? 'desktop',
        'ip_address' => $ip,
        'country' => $country,
        'is_bot' => $is_bot ? 1 : 0,
        'last_activity' => current_time('mysql'),
    );

    // 检查会话是否存在
    $existing_session = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}analytics_sessions WHERE session_id = %s",
        $params['session_id']
    ));

    if ($existing_session) {
        // 更新会话
        $wpdb->update(
            $wpdb->prefix . 'analytics_sessions',
            [
                'events_count' => $existing_session->events_count + 1,
                'page_views' => $params['event_type'] === 'page_view' ? $existing_session->page_views + 1 : $existing_session->page_views,
                'last_activity' => current_time('mysql'),
            ],
            ['session_id' => $params['session_id']]
        );
    } else {
        // 新会话
        $session_data['first_page'] = $params['page_url'];
        $session_data['events_count'] = 1;
        $session_data['page_views'] = $params['event_type'] === 'page_view' ? 1 : 0;
        $session_data['created_at'] = current_time('mysql');

        $wpdb->insert($wpdb->prefix . 'analytics_sessions', $session_data);
    }

    // 插入事件
    $event_data = array(
        'event_type' => $params['event_type'],
        'session_id' => $params['session_id'],
        'user_id' => $params['user_id'] ?? null,
        'page_url' => $params['page_url'],
        'referrer' => $referrer,
        'device_type' => $params['device_type'] ?? 'desktop',
        'ip_address' => $ip,
        'country' => $country,
        'user_agent' => $user_agent,
        'event_data' => json_encode($params['data'] ?? []),
        'created_at' => current_time('mysql'),
    );

    $result = $wpdb->insert($wpdb->prefix . 'analytics_events', $event_data);

    if ($result === false) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Database error'
        ], 500);
    }

    return new WP_REST_Response(['success' => true], 200);
}

/**
 * 简单的Bot检测
 */
function leeyoung_detect_bot($user_agent) {
    $bot_patterns = [
        'bot', 'crawl', 'spider', 'slurp', 'mediapartners',
        'facebookexternalhit', 'twitterbot', 'whatsapp'
    ];

    $user_agent_lower = strtolower($user_agent);

    foreach ($bot_patterns as $pattern) {
        if (strpos($user_agent_lower, $pattern) !== false) {
            return true;
        }
    }

    return false;
}
```

## 3. 查询示例（用于分析面板）

```php
<?php
/**
 * 获取访客数量（真人）
 */
function leeyoung_get_visitor_count($start_date = null, $end_date = null) {
    global $wpdb;

    $where = "WHERE is_bot = 0";

    if ($start_date && $end_date) {
        $where .= $wpdb->prepare(" AND created_at BETWEEN %s AND %s", $start_date, $end_date);
    }

    $count = $wpdb->get_var("
        SELECT COUNT(DISTINCT session_id)
        FROM {$wpdb->prefix}analytics_sessions
        $where
    ");

    return intval($count);
}

/**
 * 获取漏斗数据
 */
function leeyoung_get_funnel_data($start_date = null, $end_date = null) {
    global $wpdb;

    $where = "WHERE 1=1";

    if ($start_date && $end_date) {
        $where .= $wpdb->prepare(" AND created_at BETWEEN %s AND %s", $start_date, $end_date);
    }

    $funnel = array(
        'visitors' => leeyoung_get_visitor_count($start_date, $end_date),
        'product_views' => $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}analytics_events $where AND event_type = 'product_view'"),
        'add_to_cart' => $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}analytics_events $where AND event_type = 'add_to_cart'"),
        'begin_checkout' => $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}analytics_events $where AND event_type = 'begin_checkout'"),
        'purchase' => $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}analytics_events $where AND event_type = 'purchase'"),
    );

    return $funnel;
}

/**
 * 获取设备类型分布
 */
function leeyoung_get_device_distribution($start_date = null, $end_date = null) {
    global $wpdb;

    $where = "WHERE is_bot = 0";

    if ($start_date && $end_date) {
        $where .= $wpdb->prepare(" AND created_at BETWEEN %s AND %s", $start_date, $end_date);
    }

    $devices = $wpdb->get_results("
        SELECT device_type, COUNT(*) as count
        FROM {$wpdb->prefix}analytics_sessions
        $where
        GROUP BY device_type
    ", ARRAY_A);

    return $devices;
}

/**
 * 获取流量来源
 */
function leeyoung_get_traffic_sources($start_date = null, $end_date = null) {
    global $wpdb;

    $where = "WHERE is_bot = 0";

    if ($start_date && $end_date) {
        $where .= $wpdb->prepare(" AND created_at BETWEEN %s AND %s", $start_date, $end_date);
    }

    $sources = $wpdb->get_results("
        SELECT
            CASE
                WHEN referrer_domain LIKE '%google%' THEN 'Google'
                WHEN referrer_domain LIKE '%facebook%' OR referrer_domain LIKE '%fb.%' THEN 'Facebook'
                WHEN referrer_domain LIKE '%instagram%' THEN 'Instagram'
                WHEN referrer_domain LIKE '%twitter%' OR referrer_domain LIKE '%t.co%' THEN 'Twitter'
                WHEN referrer_domain LIKE '%tiktok%' THEN 'TikTok'
                WHEN referrer = '' OR referrer = 'direct' THEN 'Direct'
                ELSE 'Other'
            END as source,
            COUNT(*) as count
        FROM {$wpdb->prefix}analytics_sessions
        $where
        GROUP BY source
        ORDER BY count DESC
    ", ARRAY_A);

    return $sources;
}

/**
 * 获取国家/州分布
 */
function leeyoung_get_geo_distribution($start_date = null, $end_date = null) {
    global $wpdb;

    $where = "WHERE is_bot = 0 AND country != ''";

    if ($start_date && $end_date) {
        $where .= $wpdb->prepare(" AND created_at BETWEEN %s AND %s", $start_date, $end_date);
    }

    $geo = $wpdb->get_results("
        SELECT country, state, COUNT(*) as count
        FROM {$wpdb->prefix}analytics_sessions
        $where
        GROUP BY country, state
        ORDER BY count DESC
        LIMIT 50
    ", ARRAY_A);

    return $geo;
}

/**
 * 计算复购率
 */
function leeyoung_get_repeat_purchase_rate($start_date = null, $end_date = null) {
    global $wpdb;

    $where = "";

    if ($start_date && $end_date) {
        $where = $wpdb->prepare(" AND created_at BETWEEN %s AND %s", $start_date, $end_date);
    }

    // 获取有购买记录的用户
    $total_customers = $wpdb->get_var("
        SELECT COUNT(DISTINCT user_id)
        FROM {$wpdb->prefix}analytics_events
        WHERE event_type = 'purchase' AND user_id IS NOT NULL
        $where
    ");

    // 获取有多次购买的用户
    $repeat_customers = $wpdb->get_var("
        SELECT COUNT(*)
        FROM (
            SELECT user_id, COUNT(*) as purchase_count
            FROM {$wpdb->prefix}analytics_events
            WHERE event_type = 'purchase' AND user_id IS NOT NULL
            $where
            GROUP BY user_id
            HAVING purchase_count > 1
        ) as repeat_buyers
    ");

    if ($total_customers == 0) {
        return 0;
    }

    return round(($repeat_customers / $total_customers) * 100, 2);
}
```

## 4. 使用说明

1. 将上述代码添加到 `functions.php` 或创建自定义插件
2. 访问任意WordPress页面触发表创建
3. 前端埋点会自动发送数据到 `https://你的域名/wp-json/analytics/v1/track`
4. 使用查询函数在WordPress后台显示数据

## 下一步

你可以创建WordPress管理页面来显示这些数据，或者使用REST API将数据提供给独立的分析平台。
