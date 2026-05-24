# Missing Person Detection System - API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST /auth/register
Register a new public user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "phone": "+91-9876543210"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "public" },
    "token": "1|abc123..."
  },
  "message": "Registration successful"
}
```

### POST /auth/login
Authenticate user and receive token.

**Request Body:**
```json
{
  "email": "admin@mpds.gov",
  "password": "password"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "Admin", "role": "super_admin", "email": "admin@mpds.gov" },
    "token": "2|xyz789..."
  },
  "message": "Login successful"
}
```

### POST /auth/logout
Revoke current token. **[Auth Required]**

### GET /auth/me
Get authenticated user profile. **[Auth Required]**

### PUT /auth/profile
Update user profile. **[Auth Required]**

### PUT /auth/password
Change password. **[Auth Required]**

### POST /auth/forgot-password
Send OTP for password reset.

### POST /auth/reset-password
Reset password with OTP.

---

## Missing Person Cases

### GET /cases
List cases with filters. **[Auth Required]**

**Query Parameters:**
- `status` - Filter by status (missing, under_investigation, detected, found_safe, closed)
- `priority` - Filter by priority (low, medium, high, critical)
- `gender` - Filter by gender
- `age_min`, `age_max` - Age range filter
- `lat`, `lng`, `radius` - Location radius search (km)
- `search` - Full text search
- `page` - Page number
- `per_page` - Items per page (default 15)
- `sort_by` - Sort field
- `sort_order` - asc/desc

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "case_number": "MP-2024-00001",
      "full_name": "Priya Sharma",
      "age": 14,
      "gender": "female",
      "status": "missing",
      "priority_level": "high",
      "last_seen_location": "Connaught Place, Delhi",
      "photo": "/storage/photos/priya.jpg",
      "assigned_officer": { "id": 3, "name": "Officer Singh" },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 15, "total": 72 }
}
```

### POST /cases
Create a new missing person case. **[Auth Required - Officer/Admin]**

**Request Body (multipart/form-data):**
```
full_name: "Priya Sharma"
age: 14
gender: "female"
height: "5'2\""
weight: "45 kg"
last_seen_location: "Connaught Place, Delhi"
last_seen_lat: 28.6315
last_seen_lng: 77.2167
last_seen_date: "2024-01-15"
physical_description: "Fair complexion, long black hair..."
clothing_description: "Blue salwar kameez, white dupatta"
medical_conditions: "None"
guardian_name: "Rajesh Sharma"
guardian_phone: "+91-9876543210"
fir_number: "FIR-2024-1234"
police_station: "Connaught Place PS"
priority_level: "high"
photo: [file]
additional_photos[]: [files]
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "case_number": "MP-2024-00001",
    "status": "missing"
  },
  "message": "Case created successfully"
}
```

### GET /cases/{id}
Get case details with all relationships. **[Auth Required]**

### PUT /cases/{id}
Update case. **[Auth Required - Officer/Admin]**

### DELETE /cases/{id}
Soft delete case. **[Auth Required - Admin]**

### PUT /cases/{id}/status
Update case status. **[Auth Required - Officer/Admin]**

**Request Body:**
```json
{
  "status": "found_safe",
  "notes": "Person found safe at relative's house"
}
```

### PUT /cases/{id}/assign
Assign officer to case. **[Auth Required - Admin]**

### GET /cases-stats
Get case statistics. **[Auth Required]**

### GET /search
Full text search across cases. **[Auth Required]**

---

## Detections

### GET /detections
List detections. **[Auth Required]**

**Query Parameters:**
- `person_id` - Filter by missing person
- `camera_id` - Filter by camera
- `source` - Filter by source (cctv, public_upload, officer_upload)
- `confidence_min`, `confidence_max` - Confidence range
- `verified` - Filter verified/unverified
- `date_from`, `date_to` - Date range

### POST /detections
Create detection. **[Auth Required]**

### GET /detections/{id}
Get detection details. **[Auth Required]**

### PUT /detections/{id}/verify
Verify/reject detection. **[Auth Required - Officer/Admin]**

### GET /recent-detections
Get recent detections for live feed. **[Auth Required]**

### GET /detection-stats
Get detection statistics. **[Auth Required]**

---

## Sightings

### GET /sightings
List sightings. **[Auth Required]**

### POST /sightings
Submit a public sighting report.

**Request Body (multipart/form-data):**
```
person_id: 1
reporter_name: "Citizen Name" (optional if anonymous)
reporter_phone: "+91-9876543210" (optional)
is_anonymous: true
latitude: 28.6129
longitude: 77.2295
location_name: "Near India Gate"
image: [file]
notes: "Saw person matching description near India Gate at 3pm"
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "pending",
    "ai_similarity_score": null
  },
  "message": "Sighting report submitted successfully. Our AI will analyze the image."
}
```

### GET /sightings/{id]
Get sighting details. **[Auth Required]**

### PUT /sightings/{id}/verify
Verify/reject sighting. **[Auth Required - Officer/Admin]**

### GET /pending-sightings
Get pending sightings queue. **[Auth Required - Officer/Admin]**

---

## Cameras

### GET /cameras
List cameras. **[Auth Required]**

### POST /cameras
Add new camera. **[Auth Required - Admin]**

### GET /cameras/{id}
Get camera details with recent detections. **[Auth Required]**

### PUT /cameras/{id}
Update camera. **[Auth Required - Admin]**

### DELETE /cameras/{id}
Delete camera. **[Auth Required - Admin]**

### POST /cameras/{id}/health-check
Check camera stream health. **[Auth Required]**

### POST /cameras/{id}/start-monitoring
Start CCTV monitoring. **[Auth Required - Officer/Admin]**

### POST /cameras/{id}/stop-monitoring
Stop CCTV monitoring. **[Auth Required - Officer/Admin]**

---

## Evidence

### GET /evidence?case_id={id}
List evidence for a case. **[Auth Required]**

### POST /evidence
Upload evidence file. **[Auth Required]**

### GET /evidence/{id}
Get evidence details. **[Auth Required]**

### DELETE /evidence/{id}
Delete evidence. **[Auth Required]**

### GET /evidence/{id}/download
Download evidence file. **[Auth Required]**

---

## Alerts

### GET /alerts
List alerts for current user. **[Auth Required]**

### PUT /alerts/{id}/read
Mark alert as read. **[Auth Required]**

### PUT /alerts-read-all
Mark all alerts as read. **[Auth Required]**

### GET /alerts-unread-count
Get unread alert count. **[Auth Required]**

---

## Dashboard

### GET /dashboard/stats
Get dashboard statistics. **[Auth Required]**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "active_cases": 45,
    "total_detections": 1234,
    "pending_reports": 12,
    "success_rate": 78.5,
    "cases_this_week": 8,
    "detections_today": 23,
    "verified_today": 15,
    "trend": {
      "cases": "+12%",
      "detections": "+5%",
      "reports": "-3%"
    }
  }
}
```

### GET /dashboard/activity
Get recent activity feed. **[Auth Required]**

### GET /dashboard/trends
Get detection trends data. **[Auth Required]**

### GET /dashboard/regional
Get regional statistics. **[Auth Required]**

### GET /dashboard/heatmap
Get heatmap data points. **[Auth Required]**

---

## Users (Admin Only)

### GET /users
List users. **[Auth Required - Admin]**

### POST /users
Create user. **[Auth Required - Admin]**

### GET /users/{id}
Get user details. **[Auth Required - Admin]**

### PUT /users/{id}
Update user. **[Auth Required - Admin]**

### DELETE /users/{id}
Deactivate user. **[Auth Required - Admin]**

### GET /officers
List officers for assignment dropdown. **[Auth Required]**

---

## AI Service Endpoints

### POST /ai/generate-embedding
Generate face embedding from image.

### POST /ai/compare-face
Compare face against database.

### POST /ai/process-cctv
Process CCTV frame for face detection.

### POST /ai/detect-face
Detect faces in image.

### POST /ai/rebuild-index
Rebuild FAISS index.

### POST /ai/start-stream
Start RTSP stream processing.

### POST /ai/stop-stream
Stop stream processing.

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthenticated"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## WebSocket Events

Connect to: `ws://localhost:6001`

### Channel: `detections`
- `detection.new` - New detection event

### Channel: `sightings`
- `sighting.new` - New sighting report

### Channel: `cases.{case_id}`
- `case.updated` - Case status change

### Channel: `private-user.{user_id}`
- `alert.new` - New alert for user
