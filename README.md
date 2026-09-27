# Disaster Response Coordination Platform

> **Founding Engineer Take-Home Assignment** — Production-quality MERN stack application for coordinating disaster response.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Assignment Checklist](#2-assignment-checklist)
3. [Architecture](#3-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Database Design](#5-database-design)
6. [Technical Decisions](#6-technical-decisions)
   - [Geospatial Search](#61-geospatial-search)
   - [Caching Strategy](#62-caching-strategy)
   - [Location Resolution](#63-location-resolution)
   - [External API Failures](#64-external-api-failure-handling)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Real-Time Updates](#8-real-time-updates)
9. [Testing](#9-testing)
10. [API Documentation](#10-api-documentation)
11. [Setup & Running](#11-setup--running)
    - [Option A: Docker (Recommended)](#option-a-docker-recommended)
    - [Option B: Local Node.js](#option-b-local-nodejs)
12. [Environment Variables](#12-environment-variables)
13. [Bonus Feature: Interactive Map](#13-bonus-feature-interactive-map)
14. [Trade-offs](#14-trade-offs)
15. [AI Usage Disclosure](#15-ai-usage-disclosure)

---

## 1. Overview

This platform allows emergency coordinators and contributors to:

- **Create and manage disaster incidents** with automatic location resolution from free-text descriptions
- **Find nearby resources** (shelters, hospitals, food, water, rescue) using MongoDB geospatial queries
- **Access community reports** from a mock social media integration with Redis caching
- **Receive real-time notifications** when disaster status changes via Socket.IO
- **Coordinate response** with role-based access control (ADMIN, CONTRIBUTOR)
- **Visualize** all disasters and resources on an interactive OpenStreetMap

---

## 2. Assignment Checklist

| # | Requirement | Status |
|---|---|---|
| 1 | `POST/GET/PATCH/DELETE /disasters` with full CRUD | ✅ |
| 1 | Disaster has `id`, `title`, `description`, `location`, `tags`, `status`, `created_by`, timestamps | ✅ |
| 1 | Filter by tag: `GET /disasters?tag=flood` | ✅ |
| 1 | Filter by status: `GET /disasters?status=ACTIVE` | ✅ |
| 1 | Validation and error handling on all endpoints | ✅ |
| 2 | Location resolution from description text | ✅ |
| 2 | Extracts location names and resolves lat/lng | ✅ |
| 3 | Resource model: `id`, `name`, `type`, `location` | ✅ |
| 3 | Resource types: shelter, hospital, food, water, rescue | ✅ |
| 3 | `GET /disasters/:id/resources?lat=&lng=&radius=` | ✅ |
| 3 | Geospatial radius search (MongoDB `$geoNear`) | ✅ |
| 3 | README explanation of geospatial approach | ✅ |
| 4 | `GET /disasters/:id/reports` | ✅ |
| 4 | Mock external social media service | ✅ |
| 4 | Response normalization | ✅ |
| 4 | External API failure handling (503) | ✅ |
| 5 | Caching on community reports (Redis + in-memory fallback) | ✅ |
| 5 | Cache-Miss → Fetch → Store → Return flow | ✅ |
| 5 | Reasonable TTL (60 seconds) | ✅ |
| 5 | README explanation of caching strategy | ✅ |
| 6 | Real-time events via Socket.IO | ✅ |
| 6 | `disaster_updated` event on create/update/delete | ✅ |
| 6 | Frontend toast notification demonstrates event | ✅ |
| 7 | JWT authentication | ✅ |
| 7 | Role-based authorization (ADMIN, CONTRIBUTOR) | ✅ |
| 7 | ADMIN can create/update/delete | ✅ |
| 7 | CONTRIBUTOR can create/update but NOT delete (403) | ✅ |
| 8 | Tests for API endpoint | ✅ (20 tests) |
| 8 | Tests for validation/error scenarios | ✅ |
| 8 | Tests for important business rules (RBAC) | ✅ |
| 8 | Tests for external integration/mock | ✅ |
| 9 | README: Setup | ✅ |
| 9 | README: Architecture | ✅ |
| 9 | README: Technical decisions | ✅ |
| 9 | README: Trade-offs | ✅ |
| 9 | README: AI usage | ✅ |
| 10 | Swagger/OpenAPI documentation at `/api-docs` | ✅ |
| 10 | Postman collection | ✅ |
| 10 | `.env.example` | ✅ |
| **Bonus** | Interactive map (OpenStreetMap via Leaflet) | ✅ |

---

## 3. Architecture

```
                          ┌─────────────────────────────────┐
                          │         Browser Client           │
                          │   React + Vite + Tailwind CSS    │
                          │                                  │
                          │  Pages:                          │
                          │  • Dashboard (stats)             │
                          │  • Disaster List (filter/page)   │
                          │  • Disaster Detail               │
                          │  • Create / Edit Form            │
                          │  • 🗺️ Interactive Map (Leaflet)   │
                          └───────────┬─────────────────────┘
                                      │
                        REST API + Socket.IO WebSocket
                                      │
                          ┌───────────▼─────────────────────┐
                          │        Express.js API            │
                          │  Node.js + TypeScript            │
                          │                                  │
                          │  Middleware:                     │
                          │  • Helmet (security headers)     │
                          │  • CORS                          │
                          │  • Rate Limiting                 │
                          │  • JWT Auth                      │
                          │  • Zod Validation                │
                          │  • Centralized Error Handler     │
                          │                                  │
                          │  Services:                       │
                          │  • AuthService                   │
                          │  • DisasterService               │
                          │  • LocationResolverService       │
                          │  • ResourceService               │
                          │  • CommunityReportService        │
                          │  • MockSocialMediaService        │
                          │  • CacheService (Redis/Memory)   │
                          └───┬──────────────────────┬───────┘
                              │                      │
                  ┌───────────▼───┐        ┌─────────▼─────────┐
                  │   MongoDB 7.0 │        │   Redis 7.2        │
                  │               │        │                    │
                  │  Collections: │        │  • Report cache    │
                  │  • users      │        │  • 60s TTL         │
                  │  • disasters  │        │  • In-memory       │
                  │  • resources  │        │    fallback if     │
                  │               │        │    unavailable     │
                  │  Indexes:     │        └────────────────────┘
                  │  • 2dsphere   │
                  │  • status     │
                  │  • tags       │
                  └───────────────┘
```

**Request Flow:**
```
HTTP Request
  → Rate Limiter
  → CORS + Helmet
  → JWT Authenticate
  → Zod Validate
  → Controller
  → Service
  → MongoDB / Redis / External Mock
  → Structured JSON Response
```

---

## 4. Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + TypeScript | Runtime + type safety |
| Express.js | HTTP server and routing |
| MongoDB + Mongoose | Primary database with geospatial support |
| Zod | Request schema validation |
| JWT (`jsonwebtoken`) | Authentication tokens |
| bcryptjs | Password hashing |
| Socket.IO | Real-time event broadcasting |
| ioredis | Redis client with auto-reconnect |
| Helmet | HTTP security headers |
| express-rate-limit | Rate limiting |
| swagger-jsdoc + swagger-ui-express | API documentation |
| Winston | Structured logging |
| Vitest + Supertest | Integration testing |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Dev server + build tool |
| Tailwind CSS | Utility-first styling |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| Socket.IO Client | Real-time event listening |
| Leaflet + react-leaflet | Interactive map (OpenStreetMap) |

---

## 5. Database Design

### User Collection
```
_id            ObjectId
name           String
email          String (unique, indexed)
passwordHash   String (never returned in responses)
role           Enum: ADMIN | CONTRIBUTOR
createdAt      Date
updatedAt      Date
```

### Disaster Collection
```
_id            ObjectId
title          String
description    String
location       GeoJSON Point {
                 name: String,
                 type: "Point",
                 coordinates: [longitude, latitude]
               }
tags           [String]
status         Enum: ACTIVE | RESOLVED
createdBy      ObjectId → User
createdAt      Date
updatedAt      Date

Indexes:
  location: "2dsphere"    → enables geospatial queries
  status: 1               → fast status filtering
  tags: 1                 → fast tag filtering
```

### Resource Collection
```
_id            ObjectId
name           String
type           Enum: SHELTER | HOSPITAL | FOOD | WATER | RESCUE
location       GeoJSON Point {
                 type: "Point",
                 coordinates: [longitude, latitude]
               }
createdAt      Date
updatedAt      Date

Indexes:
  location: "2dsphere"    → enables proximity search
```

---

## 6. Technical Decisions

### 6.1 Geospatial Search

Both `Disaster` and `Resource` models store coordinates as **GeoJSON Points**:

```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

> ⚠️ MongoDB stores coordinates as `[longitude, latitude]` — opposite of the common `lat, lng` convention.

Both models have a `2dsphere` index, which enables MongoDB's sphere-aware distance operators.

The `/disasters/:id/resources` endpoint uses the **`$geoNear` aggregation stage**:

```js
Resource.aggregate([
  {
    $geoNear: {
      near: { type: 'Point', coordinates: [lng, lat] },
      distanceField: 'distance_meters',
      maxDistance: radiusKm * 1000,  // km → meters
      spherical: true,               // Earth is not flat
    }
  },
  {
    $project: {
      name: 1, type: 1, location: 1,
      distance_km: { $round: [{ $divide: ['$distance_meters', 1000] }, 2] }
    }
  }
])
```

**Why `$geoNear`?**
- Filtering happens **on the database server**, not in application code
- Uses the `2dsphere` index for O(log n) lookups instead of full collection scans
- Automatically sorts results by distance (nearest first)
- Returns server-computed `distance_km` without additional JS processing

**Why not `$near` or `$geoWithin`?** `$geoNear` is the only geospatial operator that works in aggregation pipelines, allowing us to combine proximity filtering with projections and transformations in a single database round-trip.

### 6.2 Caching Strategy

Community reports (`GET /disasters/:id/reports`) are cached using a two-tier strategy:

**Primary:** Redis via `ioredis`  
**Fallback:** In-memory `Map` with TTL tracking (used automatically when Redis is unavailable)

**Cache key:** `reports:disaster:<disasterId>`  
**TTL:** 60 seconds  
**Invalidation:** On disaster update or delete

**Flow:**
```
GET /disasters/:id/reports
  ↓
CacheService.get("reports:disaster:<id>")
  ↓
CACHE HIT?  → Return cached JSON immediately
  ↓
CACHE MISS
  ↓
MockSocialMediaService.fetch(disasterTitle)   [EXTERNAL_FETCH logged]
  ↓
Normalize: { text, author.username } → { content, user }
  ↓
CacheService.set(key, normalized, 60)
  ↓
Return response
```

**Fallback behavior:** `CacheService` catches Redis connection errors and transparently switches to the in-memory store. The `/api/health` endpoint reports which cache backend is active.

**Logs emitted:** `CACHE_HIT`, `CACHE_MISS`, `EXTERNAL_FETCH` — visible in server logs.

### 6.3 Location Resolution

The `LocationResolverService` extracts a known location from disaster descriptions using **word-boundary regex matching with longest-match priority**.

```ts
// Example
resolve("Heavy flooding has struck San Francisco, causing building collapses.")
// → { name: "San Francisco, California", latitude: 37.7749, longitude: -122.4194 }
```

**Matching logic:**
1. For each location keyword (e.g. `"san francisco"`, `"sf"`, `"bay area"`), test the description with `\bkeyword\b` (word boundary) to avoid partial matches
2. If multiple keywords match, pick the **longest-matching keyword** to resolve `"los angeles"` over the shorter `"la"` or `"california"`
3. If no keyword matches, return HTTP 400 with a clear error message

**Supported locations (20+):** New York/Manhattan, Mumbai, Delhi, Bangalore, Chicago, Los Angeles, San Francisco, Houston, Miami, Seattle, London, Tokyo, Sydney, Toronto, Paris, Chennai, Kolkata, Hyderabad, and more.

**Why mock?** Real geocoding APIs (Google Maps, Mapbox, Nominatim) require API keys and network access. The mock demonstrates the identical architectural pattern (isolated service, pluggable interface) without external dependencies.

**How to plug in a real provider:**
1. The resolver lives in `backend/src/services/locationResolver.service.ts`
2. Replace the keyword-matching logic with an HTTP call to your geocoding API
3. The interface `resolve(description) → { name, latitude, longitude }` stays identical
4. Everything else (disaster creation flow, error handling) remains unchanged

### 6.4 External API Failure Handling

The `MockSocialMediaService` supports a `enableFailureMode()` / `disableFailureMode()` toggle for testing. When an external call fails:

1. The error is **caught** in `CommunityReportService.getReportsForDisaster()`
2. An `ExternalServiceError` (503) is thrown — **not** a raw 500
3. The centralized error middleware converts it to a clean JSON response with no stack trace
4. The test suite verifies this behavior explicitly (Test 6)

```json
{
  "success": false,
  "message": "Could not fetch community reports. External service unavailable.",
  "data": null
}
```

---

## 7. Authentication & Authorization

### JWT Flow
```
POST /api/auth/login { email, password }
  → bcrypt.compare(password, hash)
  → jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" })
  → Returns Bearer token
```

All subsequent requests must include: `Authorization: Bearer <token>`

### Role Matrix

| Action | ADMIN | CONTRIBUTOR |
|---|---|---|
| GET disasters (list/detail) | ✅ | ✅ |
| POST disaster (create) | ✅ | ✅ |
| PATCH disaster (update) | ✅ | ✅ |
| DELETE disaster | ✅ | ❌ 403 |
| GET resources | ✅ | ✅ |
| GET reports | ✅ | ✅ |

### Development Credentials

> ⚠️ For development/testing only. Never use in production.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `admin123` |
| Contributor | `contributor@example.com` | `contributor123` |

---

## 8. Real-Time Updates

Socket.IO emits a `disaster_updated` event to **all connected clients** whenever a disaster is created, updated, or deleted:

```json
{
  "action": "created | updated | deleted",
  "disaster": {
    "id": "64abc...",
    "title": "Heavy Flooding in Manhattan",
    "status": "ACTIVE",
    "location": { "name": "Manhattan, New York City" }
  }
}
```

The React frontend listens via `socket.io-client` and displays a **toast notification** that auto-dismisses after 5 seconds. The Socket.IO server is co-hosted on the same HTTP port (5000) as the API.

---

## 9. Testing

Tests use **Vitest** + **Supertest** against a real MongoDB database (requires MongoDB running locally or via Docker).

Run tests (requires MongoDB reachable at `localhost:27017` — use the Docker container):

```bash
# Start MongoDB via Docker first (if not already running)
docker compose up mongodb redis -d

# Then run tests from the backend directory
cd backend

# PowerShell
$env:MONGODB_URI="mongodb://localhost:27017/disaster_response_test"; npm test -- --run

# Bash / Git Bash
MONGODB_URI=mongodb://localhost:27017/disaster_response_test npm test -- --run
```

| Test | What It Covers |
|---|---|
| Test 1 | `GET /api/disasters` returns 200 with filtering by status and tag |
| Test 2 | Validation — missing title/description → 400, invalid ObjectId → 400, empty update → 400 |
| Test 3 | CONTRIBUTOR cannot DELETE → 403; no token → 401 |
| Test 4 | ADMIN can create and delete disaster; 404 after deletion |
| Test 5 | Mock social media returns normalized reports (`content`, `user`, `created_at`) |
| Test 6 | External service failure → 503; no stack trace in response body |
| Test 7 | Cache miss → fetch → cache hit returns identical data; set/get/delete cycle |
| Extra | Login with valid credentials, wrong password → 401; GET /me; location resolution; unresolvable location → 400 |

**20 tests total — all passing.**

---

## 10. API Documentation

**Swagger UI:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

All endpoints are documented with schemas, authentication requirements, authorization rules, example payloads, and error responses.

**Postman Collection:** `postman/Disaster-Response.postman_collection.json`

Import into Postman and run the **"Login (Admin)"** request first — it automatically saves the token to a collection variable for subsequent requests.

### Endpoints Summary

| Method | Path | Auth | Role |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | — |
| `GET` | `/api/auth/me` | ✅ | Any |
| `GET` | `/api/disasters` | ✅ | Any |
| `POST` | `/api/disasters` | ✅ | ADMIN, CONTRIBUTOR |
| `GET` | `/api/disasters/stats` | ✅ | Any |
| `GET` | `/api/disasters/:id` | ✅ | Any |
| `PATCH` | `/api/disasters/:id` | ✅ | ADMIN, CONTRIBUTOR |
| `DELETE` | `/api/disasters/:id` | ✅ | ADMIN only |
| `GET` | `/api/disasters/:id/resources?lat=&lng=&radius=` | ✅ | Any |
| `GET` | `/api/disasters/:id/reports` | ✅ | Any |
| `GET` | `/api/health` | ❌ | — |

---

## 11. Setup & Running

### Prerequisites
- **Docker Desktop** (for Option A — recommended)
- **Node.js 18+** and npm 8+ (for Option B)
- **MongoDB 7.0** accessible at `localhost:27017` (for tests and Option B)

---

### Option A: Docker (Recommended)

Runs all 4 services (MongoDB, Redis, Backend, Frontend) in a single command.

```bash
# 1. Clone the repository
git clone <repo-url>
cd disaster-response-platform

# 2. Build Docker images
docker compose build

# 3. Start all services
docker compose up -d

# 4. Seed the database with sample data
docker compose exec backend npm run seed

# 5. Verify all services are healthy
docker compose ps
```

**Access the application:**

| Service | URL |
|---|---|
| **Frontend Web App** | http://localhost:5173 |
| **Backend API** | http://localhost:5000 |
| **Swagger API Docs** | http://localhost:5000/api-docs |
| **Health Check** | http://localhost:5000/api/health |

**Useful commands:**
```bash
# Stream logs from all containers
docker compose logs -f

# Stream logs for a specific service
docker compose logs -f backend

# Stop all containers (data volumes preserved)
docker compose down

# Stop and remove all data volumes (full reset)
docker compose down -v

# Re-seed database
docker compose exec backend npm run seed
```

---

### Option B: Local Node.js

Use this if you want to run the code directly with Node.js and Vite.

#### 1. Start MongoDB and Redis (with Docker)
```bash
docker compose up mongodb redis -d
```

Or start MongoDB manually if already installed:
```bash
mongod --dbpath ./backend/mongo-data --port 27017
```

#### 2. Install dependencies
```bash
# From project root
npm install --workspace=backend
npm install --workspace=frontend

# Note: If you encounter peer dependency errors (common with React/Leaflet versions), 
# append --legacy-peer-deps to the commands:
# npm install --workspace=frontend --legacy-peer-deps
```

#### 3. Configure environment
```bash
cp backend/.env.example backend/.env
# The defaults in .env.example work with the Docker MongoDB and Redis
```

#### 4. Seed the database
```bash
cd backend
npm run seed
```

#### 5. Start the backend
```bash
# Terminal 1 — from /backend
npm run dev
# API runs at http://localhost:5000
```

#### 6. Start the frontend
```bash
# Terminal 2 — from /frontend
npm run dev
# App runs at http://localhost:5173
```

#### 7. Run tests
```bash
# Requires MongoDB running on localhost:27017
cd backend
npm test -- --run
```

---

## 12. Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend HTTP port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/disaster_response` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` (optional — falls back to in-memory) |
| `JWT_SECRET` | JWT signing secret | *(required, min 10 chars)* |
| `JWT_EXPIRES_IN` | JWT token expiry | `7d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

> ⚠️ Never commit `.env` to version control. Only `.env.example` is committed.

---

## 13. Bonus Feature: Interactive Map

**Implemented bonus:** Interactive Map using OpenStreetMap (via [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/))

Access the map at: **http://localhost:5173/map** (or click **🗺️ Map** in the navigation bar)

### Features:
- **All disasters** plotted as color-coded pin markers:
  - 🔴 **Red pulsing dot** = Active disaster
  - ⚫ **Gray dot** = Resolved disaster
- **Click any disaster** in the sidebar or directly on the map:
  - Map flies to that location with animation
  - A **50km dashed radius circle** is drawn around the disaster
  - Nearby resources are automatically fetched from the API and displayed as emoji markers
- **Resource markers** with distinct icons per type:
  - 🏠 Shelter, 🏥 Hospital, 🍽️ Food, 💧 Water, 🚁 Rescue
- **Popups** on each marker showing title, location, tags, type, and distance
- **Sidebar** listing all disasters with tag badges and resource count
- **Legend** overlay showing marker meanings

### Why Leaflet + OpenStreetMap?
- **Free and open-source** — no API key or billing required
- **react-leaflet** provides idiomatic React components
- OpenStreetMap provides high-quality, globally maintained map tiles with proper attribution

---

## 14. Trade-offs

| Decision | What Was Simplified | What Would Change in Production |
|---|---|---|
| **Location resolution** | Keyword-based mock; 20 cities supported | Integrate real geocoding API (Google Maps, Mapbox, Nominatim) via the same interface |
| **Social media data** | Mock service simulating Twitter/X with 50ms latency and contextual responses | Real Twitter API v2 with OAuth 2.0, proper rate handling, and retry logic |
| **Authentication** | Single JWT token; no refresh token rotation | Add refresh tokens, token blacklisting on logout, and httpOnly cookies |
| **Rate limiting** | Global IP-based limit (100 req/15min) | Per-route limits, user-based limiting, sliding window with Redis |
| **Test database** | Shares `localhost:27017` with dev; test data cleared per run | Use `mongodb-memory-server` for isolated, parallelizable tests |
| **Resource seeding** | Static seed data for 13 resources | Real-time resource ingestion from emergency management APIs (FEMA, etc.) |
| **Pagination** | Only disasters list is paginated | Paginate resources and reports as well |
| **No HTTPS** | HTTP only in development | TLS termination via reverse proxy (Nginx/Caddy) or load balancer |

---

## 15. AI Usage Disclosure

**Tool used:** Google Antigravity (AI coding assistant)

**What it helped with:**
- Generating boilerplate scaffolding (Express middleware setup, Mongoose schema definitions, Zod validators)
- Writing the full Swagger/OpenAPI documentation comments
- Writing the initial test suite structure
- Generating seed data with realistic disaster scenarios and geospatial coordinates

**What was manually implemented/modified:**
- **Architecture decisions**: Service layer separation, two-tier cache design, Socket.IO event structure
- **Location resolver logic**: The word-boundary regex matching with longest-match priority (fixed a subtle bug where `"san francisco"` was resolving to `"Los Angeles"` because `"la"` matched first)
- **Geospatial implementation**: The `$geoNear` aggregation pipeline with km-to-meters conversion and the MongoDB coordinate ordering (`[longitude, latitude]`)
- **Cache fallback**: The transparent Redis → in-memory fallback in `CacheService` with TTL tracking
- **Error hierarchy**: Custom `AppError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ExternalServiceError` classes
- **Docker setup**: The multi-stage Dockerfiles, Nginx reverse proxy config, and health check configuration
- **Interactive map**: Complete `MapPage.tsx` with Leaflet integration, marker icons, radius circles, and the sidebar-map interaction
- **Debugging**: The `@esbuild/win32-x64` Docker build failure, the `seed.ts` compilation path issue, and the `tsx: not found` container error

We understand the code submitted and can explain every technical decision.
