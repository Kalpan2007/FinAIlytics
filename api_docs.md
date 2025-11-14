# FinAIlytics Backend — API Documentation

A premium, developer-friendly reference for the FinAIlytics backend.

- Base URL (production): `https://finailytics.onrender.com`
- Base Path: `/api`
- Version: 1.0
- Tech stack: Node.js, Express, TypeScript, MongoDB (Mongoose), Passport JWT, Cloudinary, Google Gemini, Resend

---

## 1. Project Overview

FinAIlytics is an AI‑powered personal finance backend that enables:
- Secure authentication with JWT (access + refresh).
- CRUD for transactions, bulk CSV imports, and AI receipt scanning (Gemini).
- Analytics (summary, time series, expense breakdown).
- Scheduled and on‑demand monthly reports (email via Resend).

Core design goals:
- Strict typing via TypeScript + Zod validators.
- Clean layering (routes → controllers → services → models).
- Extensible providers (Cloudinary, Gemini, Resend) behind config modules.

---

## 2. Folder Structure

```
backend/src
├─ @types/                  # Global TS types & request augmentation
├─ config/                  # App configuration & integrations
│  ├─ cloudinary.config.ts  # Cloudinary upload configuration
│  ├─ database.config.ts    # MongoDB connection (Mongoose)
│  ├─ env.config.ts         # Strongly-typed env variables
│  ├─ google-ai.config.ts   # Gemini client setup
│  ├─ http.config.ts        # HTTP status codes & constants
│  ├─ passport.config.ts    # Passport JWT strategies + helpers
│  └─ resend.config.ts      # Resend email client
├─ controllers/             # Route handlers (req/res orchestration)
│  ├─ analytics.controller.ts
│  ├─ auth.controller.ts
│  ├─ report.controller.ts
│  ├─ transaction.controller.ts
│  └─ user.controller.ts
├─ cron/                    # Scheduled jobs & runner
│  ├─ jobs/                 # Individual cron jobs (e.g., reports)
│  ├─ scheduler.ts          # Cron scheduling utilities
│  └─ index.ts              # Cron initializer
├─ enums/                   # Enums used across layers
├─ mailers/                 # Email senders & templates
│  ├─ report.mailer.ts
│  └─ templates/
├─ middlewares/             # Express middlewares
│  ├─ asyncHandler.middlerware.ts
│  ├─ errorHandler.middleware.ts
├─ models/                  # Mongoose schemas & models
│  ├─ report-setting.model.ts
│  ├─ report.model.ts
│  ├─ transaction.model.ts
│  └─ user.model.ts
├─ routes/                  # Express Routers (mount under BASE_PATH)
│  ├─ analytics.route.ts
│  ├─ auth.route.ts
│  ├─ report.route.ts
│  ├─ transaction.route.ts
│  └─ user.route.ts
├─ services/                # Business logic (no HTTP concerns)
│  ├─ analytics.service.ts
│  ├─ auth.service.ts
│  ├─ report.service.ts
│  ├─ transaction.service.ts
│  └─ user.service.ts
├─ utils/                   # Helpers (dates, formatting, errors)
├─ validators/              # Zod validators for inputs
└─ index.ts                 # App entry, mounts routes & middlewares
```

Key structure rationale:
- Controllers are thin and defer to services.
- Services are unit-test friendly and model‑focused.
- Models are the single source of persistence truth.
- Middlewares standardize error and auth flows.

---

## 3. Environment Variables

Put these in `backend/.env` in development and your platform’s env manager in production.

| Variable | Required | Description | Example |
|---|---|---|---|
| NODE_ENV | yes | Runtime environment | `production` |
| PORT | yes | Port to listen on | `8000` |
| BASE_PATH | yes | API base path | `/api` |
| FRONTEND_ORIGIN | yes | Allowed CORS origin (frontend) | `https://finailytics.netlify.app` |
| MONGO_URI | yes | MongoDB connection string | `mongodb+srv://user:pass@cluster/db` |
| JWT_SECRET | yes | Access token secret | `super_secret` |
| JWT_EXPIRES_IN | yes | Access token TTL | `15m` |
| JWT_REFRESH_SECRET | yes | Refresh token secret | `super_refresh` |
| JWT_REFRESH_EXPIRES_IN | yes | Refresh TTL | `7d` |
| GEMINI_API_KEY | yes | Google Gemini API key | `...` |
| CLOUDINARY_CLOUD_NAME | yes | Cloudinary cloud name | `your_cloud` |
| CLOUDINARY_API_KEY | yes | Cloudinary API key | `...` |
| CLOUDINARY_API_SECRET | yes | Cloudinary secret | `...` |
| RESEND_API_KEY | optional | Email API key | `re_...` |
| RESEND_MAILER_SENDER | optional | From email | `no-reply@domain.com` |

Notes:
- Never expose backend secrets in the frontend (avoid `VITE_` prefix on backend).
- Render/Netlify inject envs at build/runtime — prefer platform KV storage.

---

## 4. API Authentication

JWT with access + refresh:
- Access token (short‑lived) returned by `/auth/login` and `/auth/register`.
- Refresh token managed via httpOnly cookie (`/auth/refresh-token`).
- Protected routes require `Authorization: Bearer <accessToken>` and CORS `credentials: include` if cookies are used.

Example: Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "alex@example.com",
  "password": "StrongP@ssw0rd"
}
```
Response
```json
{
  "message": "Login successful",
  "accessToken": "<JWT>"
}
```

---

## 5. API Endpoints Documentation

Conventions
- All paths are prefixed with `/api` (BASE_PATH) in production.
- All protected endpoints require `Authorization: Bearer <token>`.
- Example dates use ISO `yyyy-mm-dd`.

### 5.1 Auth

#### POST /auth/register
- Description: Create user and sign in.
- Auth: Public
- Body
```json
{
  "name": "Alex",
  "email": "alex@example.com",
  "password": "StrongP@ssw0rd"
}
```
- 201 Created
```json
{
  "message": "Registered successfully",
  "user": {"id":"...","name":"Alex","email":"alex@example.com"},
  "accessToken": "<JWT>"
}
```
- Errors: 400 (validation), 409 (email exists)

#### POST /auth/login
- Description: Login and get access token.
- Auth: Public
- Body
```json
{"email":"alex@example.com", "password":"StrongP@ssw0rd"}
```
- 200 OK `{ "message":"Login successful", "accessToken":"<JWT>" }`
- Errors: 401/404 invalid credentials

#### POST /auth/logout
- Description: Invalidate refresh session (cookie-based)
- Auth: Refresh cookie
- 200 OK `{ "message": "Logged out" }`

#### POST /auth/refresh-token
- Description: Get a new access token using refresh cookie
- Auth: Refresh cookie
- 200 OK `{ "accessToken":"<JWT>" }`

### 5.2 Users

#### GET /user/me
- Description: Return the current authenticated user
- Auth: Bearer
- 200 OK
```json
{"id":"...","name":"Alex","email":"alex@example.com"}
```

### 5.3 Transactions

#### POST /transaction/create
- Description: Create one transaction
- Auth: Bearer
- Body
```json
{
  "title":"Coffee",
  "type":"EXPENSE",
  "amount":4.5,
  "category":"dining",
  "date":"2025-11-10",
  "paymentMethod":"CASH",
  "isRecurring":false,
  "recurringInterval":null,
  "description":"Latte"
}
```
- 201 Created `{ "message":"Created", "transaction": { ... } }`
- Errors: 400 invalid body

#### POST /transaction/bulk-transaction
- Description: Bulk import (max 300 items)
- Auth: Bearer
- Body
```json
{"transactions":[ {"title":"Coffee", "type":"EXPENSE", "amount":4.5, "category":"dining", "date":"2025-11-10", "paymentMethod":"CASH", "isRecurring":false, "recurringInterval":null, "description":""} ]}
```
- 200 OK `{ "message":"Imported", "insertedCount": <n> }`

#### POST /transaction/scan-receipt
- Description: Upload receipt, parse with Gemini, return inferred transaction
- Auth: Bearer
- Headers: `Content-Type: multipart/form-data`
- Form fields: `receipt` (jpeg/png, ~2MB)
- 200 OK
```json
{
  "title":"Subway Sandwich",
  "amount":7.99,
  "date":"2025-11-09",
  "category":"dining",
  "paymentMethod":"CARD",
  "type":"EXPENSE",
  "description":"Lunch",
  "receiptUrl":"https://res.cloudinary.com/..."
}
```

### 5.4 Analytics

All analytics endpoints accept `preset` query (e.g., `LAST_30_DAYS`, `THIS_MONTH`).

#### GET /analytics/summary
- Description: Summary cards
- Auth: Bearer
- 200 OK
```json
{"data":{"income":2500,"expenses":1200,"balance":1300,"savingRate":{"percentage":22.5,"expenseRatio":48.0}}}
```

#### GET /analytics/chart
- Description: Income vs Expenses time series
- Auth: Bearer
- 200 OK
```json
{"data":{"chartData":[{"date":"2025-11-01","income":100,"expenses":50}]}}
```

#### GET /analytics/expense-pie
- Description: Expense breakdown by category
- Auth: Bearer
- 200 OK
```json
{"data":{"breakdown":[{"name":"dining","value":135.5,"percentage":12}],"totalSpent":1135.5}}
```

### 5.5 Reports

#### GET /report/all
- Description: Paginated report history
- Auth: Bearer
- Query: `pageNumber` (default 1), `pageSize` (default 20)
- 200 OK
```json
{
  "message":"Reports history fetched successfully",
  "reports":[{"id":"...","period":{"from":"2025-10-01","to":"2025-10-31"},"createdAt":"..."}],
  "pagination":{"pageNumber":1,"pageSize":20,"totalPages":5,"totalCount":100}
}
```

#### GET /report/generate
- Description: Generate a report for a period (defaults to last 30 days)
- Auth: Bearer
- Query (optional): `from=yyyy-mm-dd`, `to=yyyy-mm-dd`
- 200 OK `{ "message":"Report generated successfully", "report": { ... } }`
- Notes: Missing/invalid dates are auto‑fixed; `from>to` will be swapped.

#### PUT /report/update-setting
- Description: Update scheduling preferences
- Auth: Bearer
- Body
```json
{"enabled":true, "sendDayOfMonth":1, "email":"alex@example.com"}
```
- 200 OK `{ "message":"Reports setting updated successfully" }`

---

## 6. Database Models

Below are representative fields (simplified for brevity). See `/models` for exact schema.

### User
```json
{
  "_id":"ObjectId",
  "name":"string",
  "email":"string (unique, lowercase)",
  "passwordHash":"string",
  "createdAt":"Date",
  "updatedAt":"Date"
}
```

### Transaction
```json
{
  "_id":"ObjectId",
  "userId":"ObjectId",
  "title":"string",
  "type":"INCOME|EXPENSE",
  "amount":"number",
  "category":"string",
  "date":"Date",
  "paymentMethod":"CARD|BANK_TRANSFER|MOBILE_PAYMENT|AUTO_DEBIT|CASH|OTHER",
  "isRecurring":"boolean",
  "recurringInterval":"DAILY|WEEKLY|MONTHLY|YEARLY|null",
  "description":"string",
  "createdAt":"Date",
  "updatedAt":"Date"
}
```

### Report
```json
{
  "_id":"ObjectId",
  "userId":"ObjectId",
  "period":{"from":"Date","to":"Date"},
  "summary":{"income":0,"expenses":0,"balance":0,"savingRate":0},
  "createdAt":"Date"
}
```

### ReportSetting
```json
{
  "_id":"ObjectId",
  "userId":"ObjectId",
  "enabled":"boolean",
  "sendDayOfMonth":"number",
  "email":"string",
  "updatedAt":"Date"
}
```

---

## 7. Services / Business Logic

- `auth.service.ts` — register/login, hashing, token issuance, refresh lifecycle.
- `transaction.service.ts` — CRUD, bulk import validation, business rules.
- `analytics.service.ts` — aggregates for charts/summary (date presets).
- `report.service.ts` — generate report given `{from,to}`, persist + (optionally) email.
- `user.service.ts` — basic user profile queries.

Each service avoids HTTP concerns and relies on models; they return typed results for controllers.

---

## 8. Middleware

- `asyncHandler.middlerware.ts` — Wraps handlers and forwards errors to a central handler.
- `errorHandler.middleware.ts` — Standard error response formatting.
- `passport.config.ts` — JWT strategies; `passportAuthenticateJwt` guard used on protected routes.
- CORS middleware — Configured with `FRONTEND_ORIGIN` and `credentials: true`.

---

## 9. Error Handling

Standard error payloads:
```json
{
  "message": "<high-level message>",
  "errorCode": "<enum/code>",
  "details": {"field":"reason"}
}
```
Common cases:
- 400 ValidationError — Invalid body/query/path.
- 401 Unauthorized — Missing/invalid JWT.
- 403 Forbidden — Insufficient privileges.
- 404 Not Found — Missing resource.
- 500 Internal Server Error — Unhandled exception.

---

## 10. Run & Build Instructions

### Prerequisites
- Node.js 18+
- MongoDB (Atlas or local)

### Development
```bash
# from backend/
npm install
npm run dev
# server: http://localhost:8000 (routes under /api)
```

### Production build & run
```bash
# from backend/
npm run build
npm start
# or on Render: build = "npm ci && npm run build", start = "npm start"
```

### Health Check (ops)
```http
GET /healthz  -> 200 {"status":"ok"}
```

Notes:
- Ensure env vars are set on your platform (see Section 3).
- Set `FRONTEND_ORIGIN` to your deployed frontend for CORS.
- `BASE_PATH=/api` must match the client’s configured base URL.
