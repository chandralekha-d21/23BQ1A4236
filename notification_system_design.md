# Stage 1

## REST API Design for Campus Notification Platform

### Endpoints

#### 1. Get All Notifications for a User
GET /api/notifications/:studentId

Headers:
Authorization: Bearer <token>

Response:
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "Company XYZ is hiring",
      "isRead": false,
      "timestamp": "2026-04-22T17:51:30"
    }
  ]
}

#### 2. Mark Notification as Read
PATCH /api/notifications/:notificationId/read

Headers:
Authorization: Bearer <token>

Response:
{
  "message": "Notification marked as read"
}

#### 3. Mark All Notifications as Read
PATCH /api/notifications/:studentId/read-all

Headers:
Authorization: Bearer <token>

Response:
{
  "message": "All notifications marked as read"
}

#### 4. Send Notification (Admin)
POST /api/notifications

Headers:
Authorization: Bearer <token>

Request Body:
{
  "studentIds": ["id1", "id2"],
  "type": "Placement",
  "message": "Company XYZ is hiring"
}

Response:
{
  "message": "Notifications sent successfully"
}

#### 5. Delete a Notification
DELETE /api/notifications/:notificationId

Headers:
Authorization: Bearer <token>

Response:
{
  "message": "Notification deleted"
}

### Real-Time Notification Mechanism
Use WebSockets (Socket.io). When a notification is created, the server emits an event to the student's socket room in real time. Each student connects with their studentId and joins a room. The server pushes notifications instantly without polling.

---

# Stage 2

## Persistent Storage

Recommended DB: PostgreSQL (Relational)

### Reason
- Notifications have structured, consistent schema
- Need for complex queries (filter by type, read status, date)
- Supports indexing well for fast lookups
- ACID compliance ensures no notification is lost

### DB Schema

CREATE TABLE students (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  studentId UUID REFERENCES students(id),
  type VARCHAR(50) CHECK (type IN ('Placement', 'Event', 'Result')),
  message TEXT,
  isRead BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW()
);

### Problems as Data Grows
- Query performance degrades with millions of rows
- Full table scans become slow without indexes
- Storage costs increase

### Solutions
- Add indexes on frequently queried columns
- Archive old notifications to a separate table
- Use pagination for fetching notifications

### Queries

Get unread notifications for a student:
SELECT * FROM notifications
WHERE studentId = 'uuid' AND isRead = false
ORDER BY createdAt DESC;

---

# Stage 3

## Query Analysis

The query:
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;

### Is the query accurate?
Yes, logically correct. Fetches unread notifications for a student ordered by newest first.

### Why is it slow?
With 5,000,000 notifications, the query does a full table scan because there are no indexes on studentID, isRead, or createdAt. The DB checks every single row.

### What to change?
Add a composite index:
CREATE INDEX idx_notifications_student_read
ON notifications (studentID, isRead, createdAt DESC);

This allows the DB to jump directly to matching rows. Cost drops from O(n) to O(log n).

### Is adding indexes on every column a good idea?
No. Bad advice because:
- Every index slows down INSERT, UPDATE, DELETE operations
- Indexes consume extra disk space
- Only columns used in WHERE, ORDER BY, JOIN benefit from indexing
- Over-indexing causes more harm than good on write-heavy tables

### Query: Students who got a Placement notification in last 7 days
SELECT DISTINCT studentID FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL '7 days';

---

# Stage 4

## Caching Strategy to Reduce DB Load

### Problem
Fetching notifications on every page load for 50,000 students overwhelms the DB.

### Solution: Redis Caching

Strategy:
- When a student loads notifications, check Redis cache first
- If cache hit, return cached data (no DB query)
- If cache miss, query DB, store result in Redis with TTL of 60 seconds
- When new notification is created, invalidate that student's cache

### Tradeoffs

Redis Cache: Very fast reads, reduces DB load. But stale data possible within TTL window.
Pagination: Limits data fetched per request. But does not help if all pages are loaded.
DB Read Replicas: Spreads read load. But adds infrastructure complexity and cost.

Best approach: Combine Redis caching and pagination for best performance.

---

# Stage 5

## Analysis of notify_all Implementation

### Shortcomings
1. Sequential processing - loops through 50,000 students one by one. Extremely slow.
2. No error handling - if send_email fails midway, rest are skipped silently.
3. Tightly coupled - email, DB save, and push happen together in sequence.
4. No retry mechanism - failed emails are lost permanently.
5. Blocks the server - synchronous loop blocks all other requests.

### What happened when send_email failed for 200 students?
Those 200 students never got DB save or app push either, since all 3 are coupled together in sequence.

### Should DB save and email happen together?
No. They should be independent. DB save should always succeed regardless of email status.

### Redesigned Solution using Message Queue

function notify_all(student_ids, message):
    for student_id in student_ids:
        push to queue: { student_id, message }

function worker():
    job = queue.dequeue()
    save_to_db(job.student_id, job.message)
    try:
        send_email(job.student_id, job.message)
    except:
        retry_queue.push(job)
    push_to_app(job.student_id, job.message)

Benefits:
- Non-blocking, main function just pushes to queue instantly
- DB save is independent of email success
- Failed emails go to retry queue automatically
- Multiple workers process in parallel
- Reliable and fault-tolerant

---

# Stage 6

## Priority Inbox Implementation

Priority is determined by:
- Placement = weight 3 (highest)
- Result = weight 2
- Event = weight 1 (lowest)

Within same type, more recent notifications rank higher.

Top 10 notifications are selected by sorting on weight first, then timestamp.
New notifications coming in are inserted into the sorted list and bottom ones are dropped to maintain top 10.