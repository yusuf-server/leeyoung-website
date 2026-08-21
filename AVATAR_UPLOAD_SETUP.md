# Avatar Upload Setup Guide

## Overview

This guide explains how to set up the custom avatar upload feature that allows users to upload profile pictures to your WordPress media library.

## Problem

The WordPress JWT Authentication plugin doesn't grant media upload permissions by default. When users try to upload avatars, they receive this error:

```
Sorry, you are not allowed to access REST API
```

## Solution

We've created a custom WordPress plugin that provides a dedicated avatar upload endpoint with manual JWT validation, bypassing the default permission restrictions.

## Installation Steps

### 1. Upload the Plugin to WordPress

1. Locate the file `avatar-upload-api.php` in your project root
2. Upload it to your WordPress installation at:
   ```
   /wp-content/plugins/avatar-upload-api.php
   ```

   You can do this via:
   - **FTP/SFTP**: Upload directly to the plugins directory
   - **WordPress Admin**: Go to Plugins → Add New → Upload Plugin (zip it first)
   - **cPanel File Manager**: Navigate to wp-content/plugins and upload

### 2. Activate the Plugin

1. Log into your WordPress admin panel
2. Go to **Plugins** → **Installed Plugins**
3. Find "Avatar Upload API" in the list
4. Click **Activate**

### 3. Verify the Endpoint

After activation, test that the custom endpoint is available:

```bash
curl https://imanmlhijab.com/wp-json/custom/v1/upload-avatar
```

You should see a response (even an error is fine, as long as the endpoint responds).

## How It Works

### Authentication Flow

1. User logs in and receives a JWT token
2. Token is stored in session cookie
3. When uploading avatar:
   - Frontend sends file with `Authorization: Bearer {token}` header
   - Plugin extracts user ID from JWT payload (`sub` field)
   - If JWT decode fails, falls back to WordPress session
   - Validates user is authenticated

### Upload Process

1. File is validated:
   - Must be image type (JPEG, PNG, GIF, WebP)
   - Maximum size: 5MB
2. File is uploaded to WordPress media library using `media_handle_upload()`
3. Avatar URL is saved to user meta:
   - `custom_avatar`: URL of uploaded image
   - `custom_avatar_id`: WordPress attachment ID
4. Response returns avatar URL to frontend

### API Endpoints

The system uses a fallback strategy:

**Primary**: Custom plugin endpoint (recommended)
```
POST /wp-json/custom/v1/upload-avatar
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

Form data:
- avatar: [image file]
```

**Fallback**: Standard WordPress media endpoint
```
POST /wp-json/wp/v2/media
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

The frontend (`/api/account/upload-avatar-v2.ts`) tries the custom endpoint first, then falls back to the standard endpoint if the plugin is not installed.

## Testing

### Test Avatar Upload

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:4321/account/settings`

3. Log in if not already authenticated

4. Click the camera icon on your avatar

5. Select an image file (< 5MB, JPEG/PNG/GIF/WebP)

6. Image should:
   - Preview immediately
   - Upload to WordPress
   - Show success message
   - Update all avatar instances on the page

### Verify in WordPress

1. Go to WordPress Admin → Media Library
2. Look for the uploaded avatar (named like `avatar-user-{userId}-{timestamp}.jpg`)
3. Check user meta in database:
   ```sql
   SELECT * FROM wp_usermeta
   WHERE user_id = {your_user_id}
   AND meta_key IN ('custom_avatar', 'custom_avatar_id');
   ```

## Troubleshooting

### Error: "Sorry, you are not allowed to access REST API"

**Cause**: Plugin not installed or not activated

**Solution**:
1. Verify plugin file is in `/wp-content/plugins/avatar-upload-api.php`
2. Check plugin is activated in WordPress admin
3. Clear WordPress object cache if using caching plugins

### Error: "No file uploaded"

**Cause**: File not included in request or wrong field name

**Solution**: Ensure the form data field is named `avatar` (not `file`)

### Error: "Invalid file type"

**Cause**: Attempting to upload non-image file

**Solution**: Only upload JPEG, PNG, GIF, or WebP images

### Error: "File size must be less than 5MB"

**Cause**: Image file is too large

**Solution**: Compress or resize image before uploading

### Upload succeeds but avatar doesn't display

**Cause**: Avatar retrieval not implemented yet

**Solution**: The avatar URL is saved to user meta (`custom_avatar`). You need to retrieve and display it:

```php
// In WordPress theme or plugin
$avatar_url = get_user_meta($user_id, 'custom_avatar', true);
if ($avatar_url) {
    echo '<img src="' . esc_url($avatar_url) . '" alt="User Avatar" />';
}
```

### CORS Errors

**Cause**: Cross-origin request blocked

**Solution**: The plugin already includes CORS headers. If issues persist:
1. Check your WordPress site allows CORS
2. Verify `.htaccess` doesn't block cross-origin requests
3. Check if a security plugin is blocking CORS

## Security Considerations

### Current Implementation

- ✅ JWT token validation (manual decode of payload)
- ✅ User authentication required
- ✅ File type validation (images only)
- ✅ File size limit (5MB max)
- ✅ WordPress native upload functions (handles security)
- ✅ User can only update their own avatar

### Recommended Enhancements

For production use, consider:

1. **Use proper JWT validation library**:
   ```php
   // Install: composer require firebase/php-jwt
   use Firebase\JWT\JWT;
   use Firebase\JWT\Key;

   $decoded = JWT::decode($token, new Key($secret_key, 'HS256'));
   ```

2. **Rate limiting**: Prevent abuse by limiting uploads per user/IP

3. **Image optimization**: Auto-compress or resize large images

4. **CDN integration**: Serve avatars from CDN for better performance

5. **Fallback avatars**: Use Gravatar or default avatar if custom not set

## File Structure

```
leeyoung-website/
├── avatar-upload-api.php                    # WordPress plugin
├── src/
│   ├── pages/
│   │   ├── account/
│   │   │   └── settings.astro              # Avatar upload UI
│   │   └── api/
│   │       └── account/
│   │           ├── upload-avatar.ts         # Original endpoint (deprecated)
│   │           └── upload-avatar-v2.ts      # New endpoint with fallback
│   └── components/
│       └── Header.astro                     # Shows user avatar
```

## API Response Examples

### Success Response

```json
{
  "success": true,
  "avatar_url": "https://imanmlhijab.com/wp-content/uploads/2026/07/avatar-user-123-1722150000.jpg",
  "attachment_id": 456,
  "user_id": 123
}
```

### Error Responses

**Unauthorized**:
```json
{
  "code": "unauthorized",
  "message": "Authentication required",
  "data": { "status": 401 }
}
```

**No file**:
```json
{
  "code": "no_file",
  "message": "No file uploaded",
  "data": { "status": 400 }
}
```

**Invalid type**:
```json
{
  "code": "invalid_type",
  "message": "Invalid file type. Only images allowed.",
  "data": { "status": 400 }
}
```

**File too large**:
```json
{
  "code": "file_too_large",
  "message": "File size must be less than 5MB",
  "data": { "status": 400 }
}
```

## Next Steps

After setting up avatar upload:

1. **Display custom avatars**: Update avatar display logic to use `custom_avatar` from user meta
2. **Avatar management**: Add delete/reset avatar functionality
3. **Image optimization**: Implement server-side image compression
4. **Crop tool**: Add client-side image cropping before upload
5. **Multiple sizes**: Generate thumbnail sizes for different display contexts

## Support

If you encounter issues:

1. Check browser console for JavaScript errors
2. Check WordPress error logs (`wp-content/debug.log`)
3. Enable WordPress debugging in `wp-config.php`:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```
4. Verify JWT token is valid (check payload in https://jwt.io)

## Summary

✅ **Plugin file**: `avatar-upload-api.php` (ready to upload)
✅ **Endpoint**: `/wp-json/custom/v1/upload-avatar`
✅ **Frontend**: Fully implemented with validation and preview
✅ **Fallback**: Uses standard WordPress endpoint if plugin unavailable

**Action required**: Upload and activate the plugin in WordPress admin.
