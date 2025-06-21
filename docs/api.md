# ParaSocial API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
- Uses JWT tokens in Authorization header
- Format: `Authorization: Bearer <token>`

---

## Authentication Endpoints

### POST /auth/register
Register a new ParaSocial account

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "displayName": "Display Name" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "username": "username",
      "displayName": "Display Name",
      "isVerified": false,
      "verificationTier": "none"
    },
    "token": "jwt_token"
  }
}
```

### POST /auth/login
Login to existing account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token"
  }
}
```

### POST /auth/logout
Logout current session

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## User Endpoints

### GET /users/me
Get current user profile

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "displayName": "Display Name",
    "bio": "User bio",
    "avatar": "avatar_url",
    "website": "https://example.com",
    "isVerified": true,
    "verificationTier": "email",
    "followersCount": 150,
    "postsCount": 42
  }
}
```

### PUT /users/me
Update current user profile

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "displayName": "New Display Name",
  "bio": "Updated bio",
  "website": "https://newsite.com"
}
```

### GET /users/:username
Get public user profile

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "username": "username",
    "displayName": "Display Name",
    "bio": "User bio",
    "avatar": "avatar_url",
    "website": "https://example.com",
    "isVerified": true,
    "verificationTier": "email",
    "followersCount": 150,
    "postsCount": 42,
    "actorId": "https://parasocial.example.com/users/username"
  }
}
```

---

## Post Endpoints

### GET /posts
Get public feed of all posts

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Posts per page (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post_id",
        "content": "Post content here",
        "contentWarning": null,
        "createdAt": "2025-01-01T12:00:00Z",
        "author": {
          "id": "user_id",
          "username": "username",
          "displayName": "Display Name",
          "avatar": "avatar_url",
          "isVerified": true
        },
        "media": [
          {
            "id": "media_id",
            "url": "https://example.com/image.jpg",
            "altText": "Image description",
            "mimeType": "image/jpeg"
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalPosts": 200,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /posts
Create a new post

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "Post content here",
  "contentWarning": "Content warning text", // optional
  "isScheduled": false, // optional
  "scheduledFor": "2025-01-02T12:00:00Z" // optional, required if isScheduled=true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "post_id",
    "content": "Post content here",
    "contentWarning": null,
    "isScheduled": false,
    "createdAt": "2025-01-01T12:00:00Z",
    "author": { /* author object */ }
  }
}
```

### GET /posts/:id
Get specific post

**Response:**
```json
{
  "success": true,
  "data": {
    /* post object with author and media */
  }
}
```

### DELETE /posts/:id
Delete own post

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

### GET /users/:username/posts
Get posts by specific user

**Query Parameters:**
- `page`, `limit` (same as /posts)

---

## Follow Endpoints

### POST /users/:username/follow
Follow a user (external ActivityPub actors can use this)

**Request Body:**
```json
{
  "actorId": "https://mastodon.social/users/someuser" // optional, for federation
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "follow_id",
    "followerId": "follower_id",
    "followedId": "followed_id",
    "createdAt": "2025-01-01T12:00:00Z"
  }
}
```

### DELETE /users/:username/follow
Unfollow a user

**Response:**
```json
{
  "success": true,
  "message": "Unfollowed successfully"
}
```

### GET /users/:username/followers
Get user's followers

**Headers:** `Authorization: Bearer <token>` (only if viewing own followers)

**Query Parameters:**
- `page`, `limit`

**Response:**
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": "follow_id",
        "followerId": "follower_id",
        "actorId": "https://mastodon.social/users/follower",
        "createdAt": "2025-01-01T12:00:00Z"
      }
    ],
    "pagination": { /* pagination object */ }
  }
}
```

---

## Moderation Endpoints

### POST /users/:username/block
Block a follower

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "reason": "Spam or harassment" // optional
}
```

### DELETE /users/:username/block
Unblock a follower

**Headers:** `Authorization: Bearer <token>`

### POST /reports
Report content or user

**Request Body:**
```json
{
  "type": "HARASSMENT", // HARASSMENT, SPAM, MISINFORMATION, etc.
  "description": "Detailed report description",
  "reportedUserId": "user_id", // either this
  "reportedPostId": "post_id"  // or this
}
```

---

## Media Endpoints

### POST /media/upload
Upload media file

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:**
- `file`: Image/media file
- `altText`: Accessibility description (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "media_id",
    "url": "https://example.com/uploads/image.jpg",
    "filename": "image.jpg",
    "mimeType": "image/jpeg",
    "size": 1024000,
    "altText": "Description"
  }
}
```

---

## ActivityPub Endpoints

### GET /.well-known/webfinger
WebFinger discovery for ActivityPub

**Query Parameters:**
- `resource`: acct:username@domain.com

### GET /users/:username
ActivityPub Actor endpoint

**Headers:** `Accept: application/activity+json`

### POST /users/:username/inbox
ActivityPub inbox for receiving federation activities

**Headers:** `Content-Type: application/activity+json`

### GET /users/:username/outbox
ActivityPub outbox for user's activities

**Headers:** `Accept: application/activity+json`

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email",
      "value": ""
    }
  }
}
```

### Common Error Codes:
- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_REQUIRED`: Missing or invalid token
- `AUTHORIZATION_FAILED`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_ERROR`: Internal server error

---

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **Post creation**: 10 posts per hour
- **General API**: 100 requests per minute
- **Media upload**: 20 uploads per hour

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- File uploads limited to 10MB
- Supported image formats: JPEG, PNG, GIF, WEBP
- Content length limit: 2000 characters per post
- Username restrictions: 3-30 characters, alphanumeric + underscores