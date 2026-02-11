# Tej India - API Documentation

Complete API reference for Tej India platform.

**Base URL**: `https://api.skillswap.in/api/v1`
**Version**: 1.0.0
**Last Updated**: January 2025

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Skills](#skills)
4. [Skill Swaps](#skill-swaps)
5. [Reviews](#reviews)
6. [Messages](#messages)
7. [Notifications](#notifications)
8. [Events](#events)
9. [Communities](#communities)
10. [Payments](#payments)
11. [Analytics](#analytics)
12. [Error Codes](#error-codes)
13. [Rate Limiting](#rate-limiting)
14. [Webhooks](#webhooks)

---

## Authentication

### Overview

Tej India uses JWT (JSON Web Tokens) for authentication. Include the token in the `Authorization` header for all authenticated requests.

```http
Authorization: Bearer <your_token_here>
```

### Register User

Create a new user account.

**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "phone": "+919876543210",
  "location": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+919876543210",
      "isEmailVerified": false,
      "createdAt": "2025-01-16T10:30:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### Login

Authenticate and receive access tokens.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "subscriptionTier": "free"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### Refresh Token

Get a new access token using refresh token.

**Endpoint**: `POST /auth/refresh`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### Logout

Invalidate current session.

**Endpoint**: `POST /auth/logout`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Forgot Password

Request password reset.

**Endpoint**: `POST /auth/forgot-password`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### Reset Password

Reset password using token from email.

**Endpoint**: `POST /auth/reset-password`

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

## Users

### Get Current User

Retrieve authenticated user's profile.

**Endpoint**: `GET /users/me`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "usr_1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+919876543210",
    "bio": "Passionate about teaching and learning",
    "avatar": "https://cdn.skillswap.in/avatars/user123.jpg",
    "location": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India"
    },
    "subscriptionTier": "premium",
    "rating": 4.8,
    "totalSwaps": 25,
    "skillsToTeach": ["Photography", "Guitar"],
    "skillsToLearn": ["Cooking", "Yoga"],
    "createdAt": "2024-06-15T10:30:00Z",
    "isEmailVerified": true,
    "isPhoneVerified": true
  }
}
```

### Update Profile

Update user profile information.

**Endpoint**: `PATCH /users/me`
**Authentication**: Required

**Request Body**:
```json
{
  "name": "John Doe Updated",
  "bio": "Updated bio",
  "avatar": "https://cdn.skillswap.in/avatars/new.jpg",
  "location": {
    "city": "Delhi",
    "state": "Delhi",
    "country": "India"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "usr_1234567890",
    "name": "John Doe Updated",
    "bio": "Updated bio",
    "avatar": "https://cdn.skillswap.in/avatars/new.jpg",
    "updatedAt": "2025-01-16T11:00:00Z"
  }
}
```

### Get User by ID

Retrieve public profile of any user.

**Endpoint**: `GET /users/:userId`
**Authentication**: Optional

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "usr_9876543210",
    "name": "Jane Smith",
    "avatar": "https://cdn.skillswap.in/avatars/jane.jpg",
    "bio": "Professional chef and yoga instructor",
    "rating": 4.9,
    "totalSwaps": 50,
    "skillsToTeach": ["Cooking", "Yoga"],
    "location": {
      "city": "Bangalore",
      "state": "Karnataka"
    },
    "joinedAt": "2024-01-10T08:00:00Z"
  }
}
```

### Search Users

Search for users by skills, location, or name.

**Endpoint**: `GET /users/search`
**Authentication**: Optional

**Query Parameters**:
- `q` (string): Search query
- `skills` (string[]): Filter by skills
- `city` (string): Filter by city
- `state` (string): Filter by state
- `minRating` (number): Minimum rating (0-5)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Example**: `GET /users/search?q=cooking&city=Mumbai&minRating=4&page=1&limit=10`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "usr_111",
        "name": "Chef Ramesh",
        "avatar": "https://cdn.skillswap.in/avatars/ramesh.jpg",
        "skillsToTeach": ["Cooking", "Baking"],
        "rating": 4.9,
        "location": {
          "city": "Mumbai",
          "state": "Maharashtra"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  }
}
```

### Upload Avatar

Upload user profile picture.

**Endpoint**: `POST /users/me/avatar`
**Authentication**: Required
**Content-Type**: `multipart/form-data`

**Request Body**:
```
file: <image file> (max 5MB, jpg/png/webp)
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://cdn.skillswap.in/avatars/usr_1234567890.jpg"
  }
}
```

---

## Skills

### Get All Skills

Retrieve list of all available skills.

**Endpoint**: `GET /skills`
**Authentication**: Optional

**Query Parameters**:
- `category` (string): Filter by category ID
- `search` (string): Search by name
- `page` (number): Page number
- `limit` (number): Items per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": "skill_123",
        "name": "Photography",
        "description": "Capture amazing photos",
        "category": {
          "id": "cat_1",
          "name": "Arts & Creativity"
        },
        "totalUsers": 1250,
        "averageRating": 4.7
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### Get Skill by ID

Get detailed information about a specific skill.

**Endpoint**: `GET /skills/:skillId`
**Authentication**: Optional

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "skill_123",
    "name": "Photography",
    "description": "Professional photography techniques",
    "category": {
      "id": "cat_1",
      "name": "Arts & Creativity"
    },
    "totalTeachers": 450,
    "totalLearners": 800,
    "averageRating": 4.7,
    "topTeachers": [
      {
        "id": "usr_111",
        "name": "John Photographer",
        "rating": 5.0,
        "totalSwaps": 75
      }
    ]
  }
}
```

### Add Skill to Profile

Add a skill to teach or learn.

**Endpoint**: `POST /users/me/skills`
**Authentication**: Required

**Request Body**:
```json
{
  "skillId": "skill_123",
  "type": "teach",
  "proficiencyLevel": "advanced",
  "yearsOfExperience": 5,
  "description": "Professional photographer with 5 years experience"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "userSkill": {
      "id": "us_456",
      "skill": {
        "id": "skill_123",
        "name": "Photography"
      },
      "type": "teach",
      "proficiencyLevel": "advanced",
      "yearsOfExperience": 5,
      "addedAt": "2025-01-16T12:00:00Z"
    }
  }
}
```

### Remove Skill from Profile

Remove a skill from your profile.

**Endpoint**: `DELETE /users/me/skills/:userSkillId`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Skill removed successfully"
}
```

### Get Skill Categories

Retrieve all skill categories.

**Endpoint**: `GET /skills/categories`
**Authentication**: Optional

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_1",
        "name": "Arts & Creativity",
        "description": "Creative and artistic skills",
        "icon": "🎨",
        "skillCount": 45
      },
      {
        "id": "cat_2",
        "name": "Technology",
        "description": "Tech and digital skills",
        "icon": "💻",
        "skillCount": 78
      }
    ]
  }
}
```

---

## Skill Swaps

### Create Swap Request

Request a skill swap with another user.

**Endpoint**: `POST /swaps`
**Authentication**: Required

**Request Body**:
```json
{
  "learnerId": "usr_1234567890",
  "teacherId": "usr_9876543210",
  "skillToLearnId": "skill_123",
  "skillToTeachId": "skill_456",
  "message": "Hi! I'd love to learn cooking from you while teaching photography",
  "proposedSchedule": {
    "startDate": "2025-02-01",
    "sessions": [
      {
        "dayOfWeek": "Monday",
        "startTime": "18:00",
        "duration": 60
      }
    ]
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "swap": {
      "id": "swap_789",
      "learner": {
        "id": "usr_1234567890",
        "name": "John Doe"
      },
      "teacher": {
        "id": "usr_9876543210",
        "name": "Jane Smith"
      },
      "skillToLearn": {
        "id": "skill_123",
        "name": "Cooking"
      },
      "skillToTeach": {
        "id": "skill_456",
        "name": "Photography"
      },
      "status": "pending",
      "createdAt": "2025-01-16T13:00:00Z"
    }
  }
}
```

### Get My Swaps

Retrieve all swaps for authenticated user.

**Endpoint**: `GET /swaps/me`
**Authentication**: Required

**Query Parameters**:
- `status` (string): Filter by status (pending, accepted, in_progress, completed, cancelled)
- `role` (string): Filter by role (learner, teacher, both)
- `page` (number): Page number
- `limit` (number): Items per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "swaps": [
      {
        "id": "swap_789",
        "otherUser": {
          "id": "usr_9876543210",
          "name": "Jane Smith",
          "avatar": "https://cdn.skillswap.in/avatars/jane.jpg"
        },
        "skill": {
          "id": "skill_123",
          "name": "Cooking"
        },
        "role": "learner",
        "status": "in_progress",
        "sessionsCompleted": 3,
        "totalSessions": 8,
        "nextSession": "2025-01-20T18:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

### Update Swap Status

Accept, reject, or update a swap request.

**Endpoint**: `PATCH /swaps/:swapId`
**Authentication**: Required

**Request Body**:
```json
{
  "status": "accepted",
  "message": "Sounds great! Looking forward to our sessions."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "swap": {
      "id": "swap_789",
      "status": "accepted",
      "updatedAt": "2025-01-16T14:00:00Z"
    }
  }
}
```

### Mark Session Complete

Mark a swap session as completed.

**Endpoint**: `POST /swaps/:swapId/sessions/:sessionId/complete`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session_111",
      "completedAt": "2025-01-16T19:00:00Z",
      "swap": {
        "sessionsCompleted": 4,
        "totalSessions": 8
      }
    }
  }
}
```

### Cancel Swap

Cancel an ongoing swap.

**Endpoint**: `DELETE /swaps/:swapId`
**Authentication**: Required

**Request Body**:
```json
{
  "reason": "Schedule conflict - unable to continue"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Swap cancelled successfully"
}
```

---

## Reviews

### Create Review

Submit a review for a completed swap.

**Endpoint**: `POST /reviews`
**Authentication**: Required

**Request Body**:
```json
{
  "swapId": "swap_789",
  "revieweeId": "usr_9876543210",
  "rating": 5,
  "comment": "Excellent teacher! Very patient and knowledgeable.",
  "categories": {
    "teaching": 5,
    "communication": 5,
    "punctuality": 5,
    "expertise": 5
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "review": {
      "id": "rev_222",
      "rating": 5,
      "comment": "Excellent teacher! Very patient and knowledgeable.",
      "reviewer": {
        "id": "usr_1234567890",
        "name": "John Doe"
      },
      "reviewee": {
        "id": "usr_9876543210",
        "name": "Jane Smith"
      },
      "createdAt": "2025-01-16T20:00:00Z"
    }
  }
}
```

### Get Reviews for User

Retrieve all reviews for a specific user.

**Endpoint**: `GET /users/:userId/reviews`
**Authentication**: Optional

**Query Parameters**:
- `page` (number): Page number
- `limit` (number): Items per page
- `minRating` (number): Filter by minimum rating

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "rev_222",
        "rating": 5,
        "comment": "Excellent teacher!",
        "reviewer": {
          "id": "usr_1234567890",
          "name": "John Doe",
          "avatar": "https://cdn.skillswap.in/avatars/john.jpg"
        },
        "skill": {
          "id": "skill_123",
          "name": "Cooking"
        },
        "createdAt": "2025-01-16T20:00:00Z"
      }
    ],
    "stats": {
      "averageRating": 4.9,
      "totalReviews": 48,
      "ratingDistribution": {
        "5": 42,
        "4": 5,
        "3": 1,
        "2": 0,
        "1": 0
      }
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 48
    }
  }
}
```

### Update Review

Update an existing review.

**Endpoint**: `PATCH /reviews/:reviewId`
**Authentication**: Required

**Request Body**:
```json
{
  "rating": 4,
  "comment": "Updated review comment"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "review": {
      "id": "rev_222",
      "rating": 4,
      "comment": "Updated review comment",
      "updatedAt": "2025-01-16T21:00:00Z"
    }
  }
}
```

### Delete Review

Delete a review.

**Endpoint**: `DELETE /reviews/:reviewId`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

## Messages

### Send Message

Send a message to another user.

**Endpoint**: `POST /messages`
**Authentication**: Required

**Request Body**:
```json
{
  "recipientId": "usr_9876543210",
  "content": "Hi! Would you like to discuss the cooking swap?",
  "attachments": [
    {
      "type": "image",
      "url": "https://cdn.skillswap.in/attachments/img123.jpg"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg_333",
      "content": "Hi! Would you like to discuss the cooking swap?",
      "sender": {
        "id": "usr_1234567890",
        "name": "John Doe"
      },
      "recipient": {
        "id": "usr_9876543210",
        "name": "Jane Smith"
      },
      "sentAt": "2025-01-16T15:00:00Z",
      "status": "sent"
    }
  }
}
```

### Get Conversations

Retrieve all message conversations.

**Endpoint**: `GET /messages/conversations`
**Authentication**: Required

**Query Parameters**:
- `unreadOnly` (boolean): Show only unread conversations
- `page` (number): Page number
- `limit` (number): Items per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_444",
        "otherUser": {
          "id": "usr_9876543210",
          "name": "Jane Smith",
          "avatar": "https://cdn.skillswap.in/avatars/jane.jpg",
          "isOnline": true
        },
        "lastMessage": {
          "content": "See you on Monday!",
          "sentAt": "2025-01-16T15:30:00Z",
          "isRead": false
        },
        "unreadCount": 2
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8
    }
  }
}
```

### Get Messages in Conversation

Retrieve messages with a specific user.

**Endpoint**: `GET /messages/conversations/:userId`
**Authentication**: Required

**Query Parameters**:
- `before` (string): Get messages before this timestamp
- `limit` (number): Number of messages (default: 50)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_333",
        "content": "Hi! Would you like to discuss the cooking swap?",
        "sender": {
          "id": "usr_1234567890",
          "name": "John Doe"
        },
        "sentAt": "2025-01-16T15:00:00Z",
        "isRead": true
      },
      {
        "id": "msg_334",
        "content": "Sure! Let's talk about it.",
        "sender": {
          "id": "usr_9876543210",
          "name": "Jane Smith"
        },
        "sentAt": "2025-01-16T15:05:00Z",
        "isRead": true
      }
    ],
    "hasMore": false
  }
}
```

### Mark Messages as Read

Mark messages as read.

**Endpoint**: `POST /messages/read`
**Authentication**: Required

**Request Body**:
```json
{
  "messageIds": ["msg_333", "msg_334"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

---

## Notifications

### Get Notifications

Retrieve user notifications.

**Endpoint**: `GET /notifications`
**Authentication**: Required

**Query Parameters**:
- `unreadOnly` (boolean): Show only unread notifications
- `type` (string): Filter by type
- `page` (number): Page number
- `limit` (number): Items per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_555",
        "type": "swap_request",
        "title": "New Swap Request",
        "message": "Jane Smith wants to swap Cooking for Photography",
        "data": {
          "swapId": "swap_789"
        },
        "isRead": false,
        "createdAt": "2025-01-16T10:00:00Z"
      }
    ],
    "unreadCount": 5,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

### Mark Notification as Read

Mark specific notification as read.

**Endpoint**: `PATCH /notifications/:notificationId/read`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Mark All as Read

Mark all notifications as read.

**Endpoint**: `POST /notifications/read-all`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### Update Notification Preferences

Update notification settings.

**Endpoint**: `PATCH /users/me/notification-preferences`
**Authentication**: Required

**Request Body**:
```json
{
  "email": {
    "swapRequests": true,
    "messages": true,
    "reminders": false,
    "marketing": false
  },
  "push": {
    "swapRequests": true,
    "messages": true,
    "reminders": true
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "preferences": {
      "email": {
        "swapRequests": true,
        "messages": true,
        "reminders": false,
        "marketing": false
      },
      "push": {
        "swapRequests": true,
        "messages": true,
        "reminders": true
      }
    }
  }
}
```

---

## Events

### Get Events

Retrieve list of community events.

**Endpoint**: `GET /events`
**Authentication**: Optional

**Query Parameters**:
- `type` (string): workshop, meetup, webinar, conference
- `category` (string): Category ID
- `city` (string): Filter by city
- `startDate` (string): Events after this date
- `endDate` (string): Events before this date
- `page` (number): Page number
- `limit` (number): Items per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "evt_666",
        "title": "Photography Workshop",
        "description": "Learn advanced photography techniques",
        "type": "workshop",
        "category": {
          "id": "cat_1",
          "name": "Arts & Creativity"
        },
        "organizer": {
          "id": "usr_111",
          "name": "John Photographer"
        },
        "location": {
          "type": "physical",
          "city": "Mumbai",
          "venue": "Creative Hub, Bandra"
        },
        "date": "2025-02-10T10:00:00Z",
        "duration": 180,
        "capacity": 20,
        "registeredCount": 15,
        "price": 500,
        "coverImage": "https://cdn.skillswap.in/events/evt666.jpg"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 35
    }
  }
}
```

### Get Event by ID

Get detailed event information.

**Endpoint**: `GET /events/:eventId`
**Authentication**: Optional

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "evt_666",
    "title": "Photography Workshop",
    "description": "Learn advanced photography techniques...",
    "type": "workshop",
    "organizer": {
      "id": "usr_111",
      "name": "John Photographer",
      "avatar": "https://cdn.skillswap.in/avatars/john.jpg",
      "rating": 4.9
    },
    "location": {
      "type": "physical",
      "city": "Mumbai",
      "venue": "Creative Hub, Bandra",
      "address": "123 Main St, Bandra West"
    },
    "date": "2025-02-10T10:00:00Z",
    "duration": 180,
    "capacity": 20,
    "registeredCount": 15,
    "price": 500,
    "agenda": [
      {
        "time": "10:00",
        "title": "Introduction to Lighting",
        "duration": 60
      }
    ],
    "requirements": ["DSLR Camera", "Laptop"],
    "coverImage": "https://cdn.skillswap.in/events/evt666.jpg",
    "gallery": [
      "https://cdn.skillswap.in/events/evt666_1.jpg"
    ]
  }
}
```

### Register for Event

Register for an event.

**Endpoint**: `POST /events/:eventId/register`
**Authentication**: Required

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg_777",
      "event": {
        "id": "evt_666",
        "title": "Photography Workshop"
      },
      "status": "confirmed",
      "registeredAt": "2025-01-16T16:00:00Z"
    }
  }
}
```

### Cancel Event Registration

Cancel event registration.

**Endpoint**: `DELETE /events/:eventId/register`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Registration cancelled successfully"
}
```

---

## Communities

### Get Communities

Retrieve list of communities.

**Endpoint**: `GET /communities`
**Authentication**: Optional

**Query Parameters**:
- `category` (string): Filter by category
- `city` (string): Filter by city
- `search` (string): Search by name
- `page` (number): Page number
- `limit` (number): Items per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "communities": [
      {
        "id": "comm_888",
        "name": "Mumbai Photographers",
        "description": "Photography enthusiasts in Mumbai",
        "category": {
          "id": "cat_1",
          "name": "Arts & Creativity"
        },
        "location": {
          "city": "Mumbai",
          "state": "Maharashtra"
        },
        "memberCount": 1250,
        "coverImage": "https://cdn.skillswap.in/communities/comm888.jpg",
        "isPrivate": false,
        "isMember": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 75
    }
  }
}
```

### Join Community

Join a community.

**Endpoint**: `POST /communities/:communityId/join`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "membership": {
      "id": "mem_999",
      "community": {
        "id": "comm_888",
        "name": "Mumbai Photographers"
      },
      "joinedAt": "2025-01-16T17:00:00Z"
    }
  }
}
```

### Leave Community

Leave a community.

**Endpoint**: `DELETE /communities/:communityId/leave`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Left community successfully"
}
```

---

## Payments

### Create Payment

Create a payment for premium subscription.

**Endpoint**: `POST /payments`
**Authentication**: Required

**Request Body**:
```json
{
  "tier": "premium",
  "billingCycle": "monthly",
  "amount": 299
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "pay_1000",
      "orderId": "order_rzp_123456",
      "amount": 299,
      "currency": "INR",
      "status": "pending"
    },
    "razorpayKey": "rzp_live_xxxxx",
    "razorpayOrderId": "order_rzp_123456"
  }
}
```

### Verify Payment

Verify Razorpay payment.

**Endpoint**: `POST /payments/verify`
**Authentication**: Required

**Request Body**:
```json
{
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_order_id": "order_xxxxx",
  "razorpay_signature": "signature_xxxxx"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "pay_1000",
      "status": "completed",
      "subscription": {
        "tier": "premium",
        "startDate": "2025-01-16",
        "endDate": "2025-02-16"
      }
    }
  }
}
```

### Get Payment History

Retrieve payment history.

**Endpoint**: `GET /payments/history`
**Authentication**: Required

**Query Parameters**:
- `page` (number): Page number
- `limit` (number): Items per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "pay_1000",
        "amount": 299,
        "currency": "INR",
        "status": "completed",
        "description": "Premium Monthly Subscription",
        "createdAt": "2025-01-16T18:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

---

## Analytics

### Get User Dashboard

Get personalized analytics dashboard.

**Endpoint**: `GET /analytics/dashboard`
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSwaps": 25,
      "completedSwaps": 20,
      "activeSwaps": 3,
      "averageRating": 4.8,
      "totalReviews": 18,
      "hoursLearned": 120,
      "hoursTaught": 110
    },
    "skillProgress": [
      {
        "skill": {
          "id": "skill_123",
          "name": "Cooking"
        },
        "sessionsCompleted": 8,
        "totalSessions": 10,
        "progress": 80
      }
    ],
    "recentActivity": [
      {
        "type": "swap_completed",
        "description": "Completed Photography swap with Jane",
        "timestamp": "2025-01-15T19:00:00Z"
      }
    ]
  }
}
```

### Get Skill Recommendations

Get AI-powered skill recommendations.

**Endpoint**: `GET /analytics/recommendations/skills`
**Authentication**: Required

**Query Parameters**:
- `limit` (number): Number of recommendations (default: 10)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "skill": {
          "id": "skill_456",
          "name": "Italian Cooking",
          "category": "Cooking & Culinary"
        },
        "score": 85,
        "reasons": [
          "Matches your interest in Cooking",
          "High demand in your area",
          "Top-rated teachers available"
        ],
        "topTeachers": [
          {
            "id": "usr_222",
            "name": "Chef Marco",
            "rating": 4.9
          }
        ]
      }
    ]
  }
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Temporary unavailability |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | Authentication required |
| `INVALID_CREDENTIALS` | Invalid email/password |
| `TOKEN_EXPIRED` | JWT token expired |
| `TOKEN_INVALID` | Invalid JWT token |
| `PERMISSION_DENIED` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RESOURCE_ALREADY_EXISTS` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `PAYMENT_FAILED` | Payment processing failed |
| `SERVER_ERROR` | Internal server error |

---

## Rate Limiting

### Limits

- **Anonymous users**: 100 requests per 15 minutes
- **Authenticated users**: 1000 requests per 15 minutes
- **Premium users**: 5000 requests per 15 minutes

### Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1642348800
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 300
  }
}
```

---

## Webhooks

### Available Events

- `swap.created`
- `swap.accepted`
- `swap.completed`
- `swap.cancelled`
- `payment.success`
- `payment.failed`
- `user.registered`
- `review.created`

### Webhook Payload Example

```json
{
  "event": "swap.completed",
  "timestamp": "2025-01-16T19:00:00Z",
  "data": {
    "swap": {
      "id": "swap_789",
      "learner": {
        "id": "usr_1234567890"
      },
      "teacher": {
        "id": "usr_9876543210"
      },
      "completedAt": "2025-01-16T19:00:00Z"
    }
  }
}
```

### Webhook Signature

All webhooks include a signature header for verification:

```http
X-SkillSwap-Signature: sha256=xxxxx
```

---

## Support

For API support:
- Email: api@skillswap.in
- Documentation: https://docs.skillswap.in
- Status Page: https://status.skillswap.in

---

## Changelog

### v1.0.0 (January 2025)
- Initial API release
- Complete authentication system
- User, skill, swap, and review endpoints
- Payment integration with Razorpay
- Real-time messaging
- Events and communities
- Analytics and recommendations

---

**End of API Documentation**
