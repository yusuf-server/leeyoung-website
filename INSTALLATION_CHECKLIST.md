# Avatar Upload - Installation Checklist

## Quick Setup (5 minutes)

### Step 1: Upload Plugin to WordPress ✓
- [ ] Log into your WordPress hosting (FTP/cPanel/SSH)
- [ ] Navigate to `/wp-content/plugins/`
- [ ] Upload `avatar-upload-api.php` to this directory
- [ ] Verify file permissions (644 or 755)

### Step 2: Activate Plugin ✓
- [ ] Go to WordPress Admin: https://imanmlhijab.com/wp-admin
- [ ] Click **Plugins** → **Installed Plugins**
- [ ] Find **"Avatar Upload API"** in the list
- [ ] Click **Activate**

### Step 3: Test the Endpoint ✓
Open your browser console and run:
```javascript
fetch('https://imanmlhijab.com/wp-json/custom/v1/upload-avatar')
  .then(r => r.json())
  .then(console.log)
```
Expected: Any response (even error) means endpoint is active ✓

### Step 4: Test Avatar Upload ✓
- [ ] Visit: http://localhost:4321/account/settings
- [ ] Log in if needed
- [ ] Click camera icon on avatar
- [ ] Select an image (< 5MB)
- [ ] Should see success message
- [ ] Avatar should update immediately

### Step 5: Verify in WordPress ✓
- [ ] Go to WordPress Admin → Media Library
- [ ] Look for uploaded avatar file
- [ ] Should see file named like: `avatar-user-{id}-{timestamp}.jpg`

## ✅ Complete!

Your avatar upload system is now fully functional.

## Troubleshooting

**Plugin not appearing in WordPress?**
- Check file is in correct directory: `/wp-content/plugins/avatar-upload-api.php`
- Check file has correct header (Plugin Name: Avatar Upload API)
- Try refreshing plugins page

**Upload fails with 401 error?**
- Check user is logged in
- Verify JWT token is valid (check session cookie)
- Check WordPress user has upload_files capability

**Upload fails with 500 error?**
- Enable WordPress debug mode in wp-config.php:
  ```php
  define('WP_DEBUG', true);
  define('WP_DEBUG_LOG', true);
  ```
- Check `/wp-content/debug.log` for errors

**CORS error?**
- Plugin includes CORS headers
- Check if hosting/security plugin is blocking cross-origin requests
- Verify .htaccess doesn't have conflicting CORS rules

## Files Involved

```
WordPress (imanmlhijab.com):
  /wp-content/plugins/avatar-upload-api.php    ← Upload this file

Local Project:
  /avatar-upload-api.php                       ← Plugin source file
  /src/pages/account/settings.astro            ← Upload UI
  /src/pages/api/account/upload-avatar-v2.ts   ← API handler
```

## Quick Commands

**Upload via SSH:**
```bash
scp avatar-upload-api.php user@imanmlhijab.com:/path/to/wp-content/plugins/
```

**Upload via WP-CLI:**
```bash
wp plugin install avatar-upload-api.php --activate
```

**Check if endpoint is active:**
```bash
curl https://imanmlhijab.com/wp-json/custom/v1/upload-avatar
```

## What Happens After Installation

1. ✅ Custom endpoint available: `/wp-json/custom/v1/upload-avatar`
2. ✅ Users can upload avatars from settings page
3. ✅ Images stored in WordPress media library
4. ✅ Avatar URL saved to user meta (`custom_avatar`)
5. ✅ Avatars display in header dropdown
6. ✅ JWT authentication validated automatically

## Need Help?

Check the full documentation: `AVATAR_UPLOAD_SETUP.md`
