<?php
/**
 * Plugin Name: Avatar Upload API
 * Description: Custom API endpoint for avatar uploads
 * Version: 1.0
 */

add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/upload-avatar', array(
        'methods' => 'POST',
        'callback' => 'handle_avatar_upload',
        'permission_callback' => '__return_true' // Allow all, we'll check manually
    ));

    register_rest_route('custom/v1', '/get-avatar', array(
        'methods' => 'GET',
        'callback' => 'handle_get_avatar',
        'permission_callback' => '__return_true'
    ));
});

function handle_avatar_upload($request) {
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');

    // Try to get user from JWT token
    $auth_header = $request->get_header('Authorization');
    $user_id = 0;
    $auth_method = 'none';

    if ($auth_header && strpos($auth_header, 'Bearer ') === 0) {
        $token = str_replace('Bearer ', '', $auth_header);

        // Try to decode JWT token
        try {
            // If you have JWT Auth plugin, use its validation
            if (function_exists('jwt_auth_validate_token')) {
                $validated = jwt_auth_validate_token($token);
                if (!is_wp_error($validated) && isset($validated->data->user->id)) {
                    $user_id = $validated->data->user->id;
                    $auth_method = 'jwt_plugin';
                }
            } else {
                // Manual JWT decode (basic, not secure for production)
                $parts = explode('.', $token);
                if (count($parts) === 3) {
                    $payload = json_decode(base64_decode($parts[1]), true);
                    if (isset($payload['sub'])) {
                        $user_id = intval($payload['sub']);
                        $auth_method = 'jwt_manual';
                    }
                }
            }
        } catch (Exception $e) {
            // Token validation failed
        }
    }

    // Fallback: check if user is logged in via WordPress session
    if ($user_id === 0) {
        $current_user = wp_get_current_user();
        if ($current_user && $current_user->ID > 0) {
            $user_id = $current_user->ID;
            $auth_method = 'wp_session';
        }
    }

    // No valid user found
    if ($user_id === 0) {
        return new WP_Error('unauthorized', 'Authentication required', array('status' => 401));
    }

    // Get user info for verification
    $user = get_user_by('id', $user_id);
    if (!$user) {
        return new WP_Error('invalid_user', 'User not found', array('status' => 404));
    }

    $files = $request->get_file_params();

    if (empty($files['avatar'])) {
        return new WP_Error('no_file', 'No file uploaded', array('status' => 400));
    }

    // Validate file type
    $allowed_types = array('image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp');
    $file_type = $files['avatar']['type'];

    if (!in_array($file_type, $allowed_types)) {
        return new WP_Error('invalid_type', 'Invalid file type. Only images allowed.', array('status' => 400));
    }

    // Validate file size (5MB max)
    if ($files['avatar']['size'] > 5 * 1024 * 1024) {
        return new WP_Error('file_too_large', 'File size must be less than 5MB', array('status' => 400));
    }

    // Set uploaded file to be processed
    $_FILES['avatar'] = $files['avatar'];

    // Upload the file
    $attachment_id = media_handle_upload('avatar', 0, array(), array(
        'test_form' => false,
        'action' => 'custom_avatar_upload'
    ));

    if (is_wp_error($attachment_id)) {
        return new WP_Error('upload_failed', $attachment_id->get_error_message(), array('status' => 500));
    }

    // Get the uploaded file URL
    $avatar_url = wp_get_attachment_url($attachment_id);

    // Save to user meta
    update_user_meta($user_id, 'custom_avatar', $avatar_url);
    update_user_meta($user_id, 'custom_avatar_id', $attachment_id);

    // 清除 WordPress 的 user meta 缓存
    wp_cache_delete($user_id, 'user_meta');
    clean_user_cache($user_id);

    // Verify the save - 直接从数据库读取
    global $wpdb;
    $table_name = $wpdb->prefix . 'usermeta';

    $saved_avatar = $wpdb->get_var($wpdb->prepare(
        "SELECT meta_value FROM $table_name WHERE user_id = %d AND meta_key = 'custom_avatar' LIMIT 1",
        $user_id
    ));

    $saved_avatar_id = $wpdb->get_var($wpdb->prepare(
        "SELECT meta_value FROM $table_name WHERE user_id = %d AND meta_key = 'custom_avatar_id' LIMIT 1",
        $user_id
    ));

    return array(
        'success' => true,
        'avatar_url' => $avatar_url,
        'attachment_id' => $attachment_id,
        'user_id' => $user_id,
        'username' => $user->user_login,
        'auth_method' => $auth_method,
        'saved_to_meta' => ($saved_avatar === $avatar_url),
        'debug' => array(
            'saved_avatar' => $saved_avatar,
            'saved_avatar_id' => $saved_avatar_id
        )
    );
}

function handle_get_avatar($request) {
    // Try to get user from JWT token
    $auth_header = $request->get_header('Authorization');
    $user_id = 0;
    $debug_info = array();

    if ($auth_header && strpos($auth_header, 'Bearer ') === 0) {
        $token = str_replace('Bearer ', '', $auth_header);
        $debug_info['has_token'] = true;
        $debug_info['token_preview'] = substr($token, 0, 20) . '...';

        // Try to decode JWT token
        try {
            // Manual JWT decode (basic, not secure for production)
            $parts = explode('.', $token);
            if (count($parts) === 3) {
                $payload = json_decode(base64_decode($parts[1]), true);
                $debug_info['raw_payload'] = $payload;

                if (isset($payload['sub'])) {
                    $user_id = intval($payload['sub']);
                    $debug_info['method'] = 'manual_jwt_decode';
                    $debug_info['jwt_payload_sub'] = $payload['sub'];
                }
            }
        } catch (Exception $e) {
            $debug_info['jwt_error'] = $e->getMessage();
        }
    } else {
        $debug_info['has_token'] = false;
    }

    // Fallback: check if user is logged in via WordPress session
    if ($user_id === 0) {
        $current_user = wp_get_current_user();
        if ($current_user && $current_user->ID > 0) {
            $user_id = $current_user->ID;
            $debug_info['method'] = 'wordpress_session';
        }
    }

    // No valid user found
    if ($user_id === 0) {
        return new WP_Error('unauthorized', 'Authentication required', array('status' => 401));
    }

    // 清除缓存，确保读取最新数据
    wp_cache_delete($user_id, 'user_meta');

    // 直接从数据库读取，绕过所有缓存
    global $wpdb;
    $table_name = $wpdb->prefix . 'usermeta';

    $avatar_url = $wpdb->get_var($wpdb->prepare(
        "SELECT meta_value FROM $table_name WHERE user_id = %d AND meta_key = 'custom_avatar' LIMIT 1",
        $user_id
    ));

    $avatar_id = $wpdb->get_var($wpdb->prepare(
        "SELECT meta_value FROM $table_name WHERE user_id = %d AND meta_key = 'custom_avatar_id' LIMIT 1",
        $user_id
    ));

    // Get user info for debugging
    $user = get_user_by('id', $user_id);
    $debug_info['user_id'] = $user_id;
    $debug_info['username'] = $user ? $user->user_login : 'unknown';
    $debug_info['avatar_in_meta'] = !empty($avatar_url);

    if ($avatar_url) {
        return array(
            'success' => true,
            'avatar_url' => $avatar_url,
            'avatar_id' => $avatar_id ? intval($avatar_id) : null,
            'user_id' => $user_id,
            'source' => 'custom',
            'debug' => $debug_info
        );
    }

    // No custom avatar, return default
    $username = $user ? $user->user_login : 'User';

    return array(
        'success' => true,
        'avatar_url' => 'https://ui-avatars.com/api/?name=' . urlencode($username) . '&size=96&background=000&color=fff',
        'avatar_id' => null,
        'user_id' => $user_id,
        'source' => 'default',
        'debug' => $debug_info
    );
}

// Add CORS headers
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

// Handle OPTIONS requests
add_action('rest_api_init', function() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
        exit(0);
    }
});
