# Avatar Upload System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                  /account/settings.astro                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. User clicks camera icon
                              │ 2. Selects image file
                              │ 3. Preview shown instantly
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE VALIDATION                       │
│                  - File type (image only)                       │
│                  - File size (< 5MB)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FormData with file
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ASTRO API ENDPOINT                         │
│              /api/account/upload-avatar-v2.ts                   │
│                                                                 │
│  1. Get session from cookie                                    │
│  2. Extract JWT token                                          │
│  3. Convert file to buffer                                     │
│  4. Create FormData with 'avatar' field                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST with Authorization header
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WORDPRESS CUSTOM PLUGIN                      │
│                     avatar-upload-api.php                       │
│                                                                 │
│  Endpoint: /wp-json/custom/v1/upload-avatar                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐    │
│  │ 1. Extract JWT from Authorization header             │    │
│  │ 2. Decode JWT payload (get user ID from 'sub')       │    │
│  │ 3. Validate file type and size                       │    │
│  │ 4. Upload to media library (media_handle_upload)     │    │
│  │ 5. Save URL to user meta (custom_avatar)             │    │
│  │ 6. Return success + avatar_url                       │    │
│  └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Response: { success, avatar_url }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WORDPRESS MEDIA LIBRARY                    │
│                                                                 │
│  File stored: /wp-content/uploads/2026/07/avatar-user-123.jpg │
│  User meta:   custom_avatar = "https://...jpg"                │
│               custom_avatar_id = 456                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Avatar URL returned
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        UI UPDATE                                │
│                                                                 │
│  - Update all avatar images on page                            │
│  - Show success message                                        │
│  - Header dropdown avatar updated                              │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
User Login
    │
    ▼
JWT Token Generated
    │
    ▼
Token Stored in Cookie (base64)
    │
    ├─── Session Format: {
    │        userId: 123,
    │        username: "user",
    │        token: "eyJhbGc...",
    │        email: "user@example.com"
    │    }
    │
    ▼
Avatar Upload Request
    │
    ├─── Header: Authorization: Bearer eyJhbGc...
    │
    ▼
WordPress Plugin
    │
    ├─── Decode JWT Payload: { sub: 123, name: "user" }
    │
    ▼
User ID = payload.sub
    │
    ▼
Upload & Save to User Meta
```

## Fallback Strategy

```
Try Upload
    │
    ▼
┌─────────────────────────┐
│ Custom Endpoint First   │  ← /wp-json/custom/v1/upload-avatar
│ (Plugin installed?)     │
└─────────────────────────┘
    │
    ├──► Success? ──► Return avatar_url
    │
    └──► Failed? ──► Try Standard Endpoint
                         │
                         ▼
                    ┌─────────────────────────┐
                    │ WordPress Media API     │  ← /wp-json/wp/v2/media
                    │ (Default WP endpoint)   │
                    └─────────────────────────┘
                         │
                         ├──► Success? ──► Return media.source_url
                         │
                         └──► Failed? ──► Show error message
```

## File Structure

```
leeyoung-website/
│
├── avatar-upload-api.php               ← WordPress plugin (upload to WP)
│
├── AVATAR_UPLOAD_SETUP.md             ← Full documentation
├── INSTALLATION_CHECKLIST.md          ← Quick setup guide
├── AVATAR_UPLOAD_ARCHITECTURE.md      ← This file
│
└── src/
    ├── pages/
    │   ├── account/
    │   │   └── settings.astro         ← Upload UI + JavaScript
    │   │
    │   └── api/
    │       └── account/
    │           ├── upload-avatar.ts         ← Old version (direct WP)
    │           └── upload-avatar-v2.ts      ← New version (with fallback)
    │
    └── components/
        └── Header.astro               ← Displays user avatar
```

## Security Features

### ✅ Client-Side
- File type validation (images only)
- File size limit (5MB max)
- Instant preview with FileReader
- User authentication check

### ✅ Server-Side (Astro)
- Session cookie validation
- JWT token extraction
- Buffer conversion for secure upload
- Error handling with detailed messages

### ✅ WordPress Plugin
- JWT token validation (decode payload)
- User authentication required (user_id > 0)
- File type whitelist (JPEG, PNG, GIF, WebP)
- File size validation (5MB limit)
- WordPress native upload functions (XSS protection, sanitization)
- CORS headers configured
- User meta storage (isolated per user)

## Database Schema

### User Meta Table
```sql
wp_usermeta
├── user_id (FK to wp_users.ID)
├── meta_key: 'custom_avatar'
│   └── meta_value: 'https://imanmlhijab.com/wp-content/uploads/.../avatar.jpg'
│
└── meta_key: 'custom_avatar_id'
    └── meta_value: 456  (attachment ID)
```

### Media Table
```sql
wp_posts (where post_type = 'attachment')
├── ID: 456
├── post_title: 'Avatar for username'
├── post_mime_type: 'image/jpeg'
├── guid: 'https://.../avatar-user-123-1722150000.jpg'
```

## API Endpoints

### Custom Plugin Endpoint
```http
POST /wp-json/custom/v1/upload-avatar
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

avatar: [binary file data]
```

**Response (Success):**
```json
{
  "success": true,
  "avatar_url": "https://imanmlhijab.com/wp-content/uploads/2026/07/avatar.jpg",
  "attachment_id": 456,
  "user_id": 123
}
```

**Response (Error):**
```json
{
  "code": "unauthorized",
  "message": "Authentication required",
  "data": { "status": 401 }
}
```

### Standard WordPress Endpoint (Fallback)
```http
POST /wp-json/wp/v2/media
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: [binary file data]
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Astro + TypeScript | SSR pages, type safety |
| **UI** | Vanilla JS + GSAP | Interactive elements, animations |
| **Authentication** | JWT (WordPress plugin) | Token-based auth |
| **Session** | HTTP-only cookies | Secure token storage |
| **File Upload** | FormData API | Multipart file transfer |
| **Backend** | WordPress REST API | Content management, media storage |
| **Database** | MySQL (WordPress) | User meta, media library |
| **Storage** | WordPress uploads directory | File storage |

## Performance Considerations

### Client-Side
- ✅ Instant preview (FileReader, no server round-trip)
- ✅ File validation before upload (saves bandwidth)
- ✅ Only updates necessary DOM elements
- ✅ No page reload required

### Server-Side
- ✅ Efficient buffer conversion
- ✅ Single database query to save meta
- ✅ WordPress caches attachment URLs
- ✅ Fallback prevents complete failure

### Potential Optimizations
- 🔄 Client-side image compression before upload
- 🔄 Generate thumbnail sizes automatically
- 🔄 Lazy load avatars on orders page
- 🔄 CDN integration for faster delivery
- 🔄 WebP conversion for smaller file sizes

## Browser Compatibility

| Feature | Requirement | Fallback |
|---------|-------------|----------|
| FileReader API | Modern browsers | N/A (required) |
| FormData | IE 10+ | N/A (required) |
| Fetch API | Modern browsers | Polyfill available |
| Arrow functions | ES6 | Transpile with Babel |
| Async/await | ES2017 | Transpile with Babel |

## Future Enhancements

1. **Image Cropping**: Add client-side crop tool before upload
2. **Multiple Formats**: Support different sizes (thumbnail, medium, large)
3. **Avatar Gallery**: Let users choose from previously uploaded avatars
4. **Gravatar Integration**: Fallback to Gravatar if no custom avatar
5. **Delete Avatar**: Add option to remove custom avatar
6. **Image Filters**: Apply filters/effects before uploading
7. **Drag & Drop**: Allow drag & drop file upload
8. **Progress Bar**: Show upload progress for large files
9. **Image Optimization**: Auto-compress images on upload
10. **Avatar Moderation**: Admin approval for inappropriate images

## Summary

The avatar upload system provides a complete, secure solution for users to upload custom profile pictures. The WordPress plugin bypasses JWT permission restrictions by manually validating tokens and using WordPress native upload functions. The frontend provides immediate feedback with client-side validation and preview, while the backend ensures security with multiple validation layers.

**Key Achievement**: Solved the JWT permission issue by creating a custom WordPress plugin that bridges the authentication gap between the Astro frontend and WordPress media library.
