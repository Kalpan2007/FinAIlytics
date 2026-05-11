# FinAIlytics API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base Configuration](#base-configuration)
3. [Authentication](#authentication)
4. [User Management](#user-management)
5. [Transactions](#transactions)
6. [Analytics](#analytics)
7. [Reports](#reports)
8. [Pagination & Filtering](#pagination--filtering)
9. [Error Handling](#error-handling)
10. [Common Data Types](#common-data-types)

---

## Overview

The FinAIlytics API is a RESTful API built with Express.js and TypeScript. All endpoints (except authentication) require JWT authentication via Bearer token.

**Base URL:** `http://localhost:8000/api`

---

## Base Configuration

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes* | Bearer token (except auth routes) |
| `Content-Type` | Yes | `application/json` for JSON bodies |
| `Content-Type` | Yes | `multipart/form-data` for file uploads |

### Environment Variables (Backend)

```env
NODE_ENV=development
PORT=8000
BASE_PATH=/api

# MongoDB
MONGO_URI=mongodb://localhost:27017/finailytics

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# AI
GEMINI_API_KEY=your_gemini_api_key

# Email
RESEND_API_KEY=your_resend_api_key
RESEND_MAILER_SENDER=no-reply@yourdomain.com

# CORS
FRONTEND_ORIGIN=http://localhost:5173
```

---

## Authentication

### POST /auth/register

Register a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `name`: string, required, 1-255 characters
- `email`: valid email format, required
- `password`: string, minimum 4 characters

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicture": null,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Codes:**
- `400`: Validation error
- `401`: User already exists

---

### POST /auth/login

Authenticate a user and receive JWT tokens.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `email`: valid email format, required
- `password`: string, minimum 4 characters

**Response (200 OK):**
```json
{
  "message": "User logged in successfully",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2025-01-01T00:15:00.000Z",
  "reportSetting": {
    "_id": "...",
    "frequency": "MONTHLY",
    "isEnabled": true
  }
}
```

**Token Details:**
- Access token expires in 15 minutes
- Refresh token expires in 7 days (stored in HTTP-only cookie)
- Both tokens are required for secure session management

**Error Codes:**
- `400`: Validation error
- `404`: Email/password not found

---

## User Management

All user endpoints require JWT authentication.

### GET /user/current-user

Retrieve the currently authenticated user's profile.

**Endpoint:** `GET /api/user/current-user`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "User fetched successfully",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": "https://res.cloudinary.com/...",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### PUT /user/update

Update user profile, including profile picture upload.

**Endpoint:** `PUT /api/user/update`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | User's display name |
| `profilePicture` | file | No | Image file (JPEG/PNG) |

**Response (200 OK):**
```json
{
  "message": "User updated successfully",
  "user": {
    "_id": "...",
    "name": "John Updated",
    "email": "john@example.com",
    "profilePicture": "https://res.cloudinary.com/...",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-02T00:00:00.000Z"
  }
}
```

---

## Transactions

All transaction endpoints require JWT authentication.

### POST /transaction/create

Create a new transaction (income or expense).

**Endpoint:** `POST /api/transaction/create`

**Request Body:**
```json
{
  "title": "Grocery Shopping",
  "type": "EXPENSE",
  "amount": 125.50,
  "category": "groceries",
  "description": "Weekly groceries from Walmart",
  "date": "2025-01-15",
  "paymentMethod": "CARD",
  "isRecurring": false,
  "recurringInterval": null
}
```

**Validation Rules:**
- `title`: string, required, 1-255 characters
- `type`: enum, required (`INCOME` | `EXPENSE`)
- `amount`: number, required, positive value
- `category`: string, required
- `description`: string, optional
- `date`: string (ISO date), required
- `paymentMethod`: enum, required (`CARD` | `BANK_TRANSFER` | `MOBILE_PAYMENT` | `AUTO_DEBIT` | `CASH` | `OTHER`)
- `isRecurring`: boolean, default `false`
- `recurringInterval`: enum, optional (`DAILY` | `WEEKLY` | `MONTHLY` | `YEARLY`)

**Response (201 Created):**
```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "_id": "...",
    "userId": "...",
    "title": "Grocery Shopping",
    "type": "EXPENSE",
    "amount": 125.50,
    "category": "groceries",
    "description": "Weekly groceries from Walmart",
    "date": "2025-01-15T00:00:00.000Z",
    "paymentMethod": "CARD",
    "isRecurring": false,
    "recurringInterval": null,
    "status": "COMPLETED",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Codes:**
- `400`: Validation error

---

### GET /transaction/all

Retrieve all transactions with pagination and filtering.

**Endpoint:** `GET /api/transaction/all`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageNumber` | integer | No | Page number (default: 1) |
| `pageSize` | integer | No | Items per page (default: 20) |
| `keyword` | string | No | Search by title or category |
| `type` | string | No | Filter by type (`INCOME` or `EXPENSE`) |
| `recurringStatus` | string | No | Filter by recurring status (`RECURRING` or `NON_RECURRING`) |

**Example Request:**
```
GET /api/transaction/all?pageNumber=1&pageSize=20&type=EXPENSE&keyword=grocery
```

**Response (200 OK):**
```json
{
  "message": "Transaction fetched successfully",
  "transations": [
    {
      "_id": "...",
      "title": "Grocery Shopping",
      "type": "EXPENSE",
      "amount": 125.50,
      "category": "groceries",
      "description": "Weekly groceries",
      "date": "2025-01-15T00:00:00.000Z",
      "paymentMethod": "CARD",
      "isRecurring": false,
      "recurringInterval": null,
      "status": "COMPLETED",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "pageSize": 20,
    "pageNumber": 1,
    "totalCount": 150,
    "totalPages": 8,
    "skip": 0
  }
}
```

---

### GET /transaction/:id

Retrieve a single transaction by ID.

**Endpoint:** `GET /api/transaction/:id`

**Example:**
```
GET /api/transaction/507f1f77bcf86cd799439011
```

**Response (200 OK):**
```json
{
  "message": "Transaction fetched successfully",
  "transaction": {
    "_id": "...",
    "title": "Grocery Shopping",
    "type": "EXPENSE",
    "amount": 125.50,
    "category": "groceries",
    "date": "2025-01-15T00:00:00.000Z",
    "paymentMethod": "CARD",
    "isRecurring": false,
    "status": "COMPLETED",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Codes:**
- `404`: Transaction not found

---

### PUT /transaction/update/:id

Update an existing transaction.

**Endpoint:** `PUT /api/transaction/update/:id`

**Request Body:**
```json
{
  "title": "Updated Grocery Shopping",
  "amount": 150.00,
  "category": "groceries",
  "description": "Updated description",
  "type": "EXPENSE",
  "paymentMethod": "CARD",
  "date": "2025-01-16",
  "isRecurring": true,
  "recurringInterval": "WEEKLY"
}
```

**Response (200 OK):**
```json
{
  "message": "Transaction updated successfully"
}
```

**Error Codes:**
- `400`: Validation error
- `404`: Transaction not found

---

### PUT /transaction/duplicate/:id

Duplicate an existing transaction.

**Endpoint:** `PUT /api/transaction/duplicate/:id`

**Example:**
```
PUT /api/transaction/duplicate/507f1f77bcf86cd799439011
```

**Response (200 OK):**
```json
{
  "message": "Transaction duplicated successfully",
  "data": {
    "_id": "...",
    "title": "Duplicate - Grocery Shopping",
    "type": "EXPENSE",
    "amount": 125.50,
    "category": "groceries",
    "isRecurring": false,
    "recurringInterval": null,
    "createdAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**Error Codes:**
- `404`: Transaction not found

---

### DELETE /transaction/delete/:id

Delete a single transaction.

**Endpoint:** `DELETE /api/transaction/delete/:id`

**Example:**
```
DELETE /api/transaction/delete/507f1f77bcf86cd799439011
```

**Response (200 OK):**
```json
{
  "message": "Transaction deleted successfully"
}
```

**Error Codes:**
- `404`: Transaction not found

---

### POST /transaction/bulk-transaction

Import multiple transactions from CSV data.

**Endpoint:** `POST /api/transaction/bulk-transaction`

**Request Body:**
```json
{
  "transactions": [
    {
      "title": "Coffee",
      "type": "EXPENSE",
      "amount": 4.50,
      "category": "dining",
      "description": "",
      "date": "2025-01-10",
      "paymentMethod": "CASH",
      "isRecurring": false,
      "recurringInterval": null
    },
    {
      "title": "Salary",
      "type": "INCOME",
      "amount": 5000,
      "category": "salary",
      "description": "Monthly salary",
      "date": "2025-01-01",
      "paymentMethod": "BANK_TRANSFER",
      "isRecurring": true,
      "recurringInterval": "MONTHLY"
    }
  ]
}
```

**Constraints:**
- Maximum 300 transactions per request
- Each transaction follows the same validation as single creation

**Response (200 OK):**
```json
{
  "message": "Bulk transaction inserted successfully",
  "insertedCount": 2,
  "success": true
}
```

**Error Codes:**
- `400`: Validation error or limit exceeded

---

### DELETE /transaction/bulk-delete

Delete multiple transactions at once.

**Endpoint:** `DELETE /api/transaction/bulk-delete`

**Request Body:**
```json
{
  "transactionIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

**Response (200 OK):**
```json
{
  "message": "Transaction deleted successfully",
  "sucess": true,
  "deletedCount": 3
}
```

**Error Codes:**
- `404`: No transactions found

---

### POST /transaction/scan-receipt

AI-powered receipt scanning using Google Gemini.

**Endpoint:** `POST /api/transaction/scan-receipt`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receipt` | file | Yes | Receipt image (JPEG/PNG, max 2MB) |

**Response (200 OK):**
```json
{
  "message": "Receipt scanned successfully",
  "data": {
    "title": "Walmart Supercenter",
    "amount": 125.50,
    "date": "2025-01-15",
    "description": "Grocery items",
    "category": "groceries",
    "paymentMethod": "CARD",
    "type": "EXPENSE",
    "receiptUrl": "https://res.cloudinary.com/..."
  }
}
```

**Error Handling:**
```json
{
  "message": "Receipt scanned successfully",
  "data": {
    "error": "Could not read receipt content"
  }
}
```

**How It Works:**
1. Image uploaded to Cloudinary
2. Image converted to base64
3. Sent to Google Gemini AI with custom prompt
4. AI extracts: title, amount, date, description, category, payment method, type

---

## Analytics

All analytics endpoints require JWT authentication.

### GET /analytics/summary

Get financial summary with percentage changes.

**Endpoint:** `GET /api/analytics/summary`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `preset` | string | No | Date range preset |
| `from` | string | No | Custom start date (ISO) |
| `to` | string | No | Custom end date (ISO) |

**Presets:**
- `TODAY`
- `YESTERDAY`
- `LAST_7_DAYS`
- `LAST_30_DAYS`
- `THIS_MONTH`
- `LAST_MONTH`
- `THIS_YEAR`
- `LAST_YEAR`
- `ALL_TIME`

**Example:**
```
GET /api/analytics/summary?preset=LAST_30_DAYS
```

**Response (200 OK):**
```json
{
  "message": "Summary fetched successfully",
  "data": {
    "availableBalance": 12500.00,
    "totalIncome": 15000.00,
    "totalExpenses": 2500.00,
    "savingRate": {
      "percentage": 83.33,
      "expenseRatio": 16.67
    },
    "transactionCount": 45,
    "percentageChange": {
      "income": 10.5,
      "expenses": -5.2,
      "balance": 15.3,
      "prevPeriodFrom": "2024-12-01T00:00:00.000Z",
      "prevPeriodTo": "2024-12-31T23:59:59.000Z",
      "previousValues": {
        "incomeAmount": 13500.00,
        "expenseAmount": 2650.00,
        "balanceAmount": 10850.00
      }
    },
    "preset": {
      "from": "2025-01-01T00:00:00.000Z",
      "to": "2025-01-31T23:59:59.000Z",
      "value": "THIS_MONTH",
      "label": "This Month"
    }
  }
}
```

**Calculations:**
- **Available Balance**: `totalIncome - totalExpenses`
- **Savings Rate**: `((income - expenses) / income) * 100` (clamped -100% to 100%)
- **Expense Ratio**: `(expenses / income) * 100` (clamped 0% to 100%)
- **Percentage Change**: Comparison with previous period of same duration

---

### GET /analytics/chart

Get income vs expenses chart data over time.

**Endpoint:** `GET /api/analytics/chart`

**Query Parameters:** Same as summary endpoint.

**Response (200 OK):**
```json
{
  "message": "Chart fetched successfully",
  "data": {
    "chartData": [
      {
        "date": "2025-01-01",
        "income": 5000.00,
        "expenses": 1200.00
      },
      {
        "date": "2025-01-02",
        "income": 0,
        "expenses": 85.50
      },
      {
        "date": "2025-01-03",
        "income": 1500.00,
        "expenses": 450.00
      }
    ],
    "totalIncomeCount": 3,
    "totalExpenseCount": 15,
    "preset": {
      "from": "2025-01-01T00:00:00.000Z",
      "to": "2025-01-31T23:59:59.000Z",
      "value": "THIS_MONTH",
      "label": "This Month"
    }
  }
}
```

---

### GET /analytics/expense-breakdown

Get expense breakdown by category as a pie chart.

**Endpoint:** `GET /api/analytics/expense-breakdown`

**Query Parameters:** Same as summary endpoint.

**Response (200 OK):**
```json
{
  "message": "Expense breakdown fetched successfully",
  "data": {
    "totalSpent": 2500.00,
    "breakdown": [
      {
        "name": "groceries",
        "value": 800.00,
        "percentage": 32
      },
      {
        "name": "utilities",
        "value": 500.00,
        "percentage": 20
      },
      {
        "name": "entertainment",
        "value": 400.00,
        "percentage": 16
      },
      {
        "name": "others",
        "value": 800.00,
        "percentage": 32
      }
    ],
    "preset": {
      "from": "2025-01-01T00:00:00.000Z",
      "to": "2025-01-31T23:59:59.000Z",
      "value": "THIS_MONTH",
      "label": "This Month"
    }
  }
}
```

**Note:**
- Top 3 categories shown individually
- All remaining categories combined as "others"
- Percentages calculated relative to total spent

---

## Reports

All report endpoints require JWT authentication.

### GET /report/all

Get report history with pagination.

**Endpoint:** `GET /api/report/all`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageNumber` | integer | No | Page number (default: 1) |
| `pageSize` | integer | No | Items per page (default: 20) |

**Response (200 OK):**
```json
{
  "message": "Reports history fetched successfully",
  "reports": [
    {
      "_id": "...",
      "userId": "...",
      "sentDate": "2025-01-01T10:00:00.000Z",
      "period": "December 1 – 31, 2024",
      "status": "SENT",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "pageSize": 20,
    "pageNumber": 1,
    "totalCount": 5,
    "totalPages": 1,
    "skip": 0
  }
}
```

**Report Status:**
- `SENT`: Successfully generated and emailed
- `FAILED`: Generation failed
- `NO_ACTIVITY`: No transactions in the period

---

### GET /report/generate

Generate a report on-demand for a specific date range.

**Endpoint:** `GET /api/report/generate`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | No | Start date (ISO) - defaults to 30 days ago |
| `to` | string | No | End date (ISO) - defaults to today |

**Example:**
```
GET /api/report/generate?from=2025-01-01&to=2025-01-31
```

**Response (200 OK):**
```json
{
  "message": "Report generated successfully",
  "report": {
    "period": "January 1 – 31, 2025",
    "summary": {
      "income": 15000.00,
      "expenses": 2500.00,
      "balance": 12500.00,
      "savingsRate": 83.33,
      "transactionCount": 45
    },
    "topCategories": [
      { "category": "groceries", "amount": 800 },
      { "category": "utilities", "amount": 500 },
      { "category": "entertainment", "amount": 400 }
    ],
    "insights": [
      "Your top spending category was groceries at $800",
      "You saved 83% of your income this month"
    ]
  }
}
```

---

### PUT /report/update-setting

Update automatic report generation settings.

**Endpoint:** `PUT /api/report/update-setting`

**Request Body:**
```json
{
  "isEnabled": true,
  "frequency": "MONTHLY"
}
```

**Validation:**
- `isEnabled`: boolean, required
- `frequency`: enum, required (`WEEKLY` | `MONTHLY`)

**Response (200 OK):**
```json
{
  "message": "Reports setting updated successfully"
}
```

---

## Pagination & Filtering

### Standard Pagination Response

All list endpoints return paginated results with this structure:

```json
{
  "pagination": {
    "pageSize": 20,
    "pageNumber": 1,
    "totalCount": 150,
    "totalPages": 8,
    "skip": 0
  }
}
```

### Filtering Strategies

**Keyword Search:**
- Searches across `title` and `category` fields
- Case-insensitive regex matching

**Type Filtering:**
- `INCOME`: Show only income transactions
- `EXPENSE`: Show only expense transactions

**Recurring Status:**
- `RECURRING`: Show only recurring transactions
- `NON_RECURRING`: Show only non-recurring transactions

**Date Range:**
- Presets: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, LAST_YEAR, ALL_TIME
- Custom range: Use `from` and `to` query parameters with ISO dates

---

## Error Handling

### HTTP Status Codes

| Status | Description |
|--------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized |
| `404` | Not Found |
| `500` | Internal Server Error |

### Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error",
  "error": "Detailed error message"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Email/password not found` | Invalid credentials | Check email and password |
| `User already exists` | Duplicate email | Use different email |
| `Transaction not found` | Invalid ID or not owned | Verify transaction ID |
| `No file uploaded` | Missing file in form data | Include `receipt` field |
| `Invalid email address` | Malformed email | Use valid email format |

---

## Common Data Types

### Enums

**Transaction Type:**
```typescript
"INCOME" | "EXPENSE"
```

**Payment Method:**
```typescript
"CARD" | "BANK_TRANSFER" | "MOBILE_PAYMENT" | "AUTO_DEBIT" | "CASH" | "OTHER"
```

**Recurring Interval:**
```typescript
"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null
```

**Transaction Status:**
```typescript
"PENDING" | "COMPLETED" | "FAILED"
```

**Report Frequency:**
```typescript
"WEEKLY" | "MONTHLY"
```

**Report Status:**
```typescript
"SENT" | "FAILED" | "NO_ACTIVITY"
```

### Date Range Presets

```typescript
"TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS" |
"THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "LAST_YEAR" | "ALL_TIME"
```

---

## Notes

- All monetary amounts are stored in cents internally and converted to dollars in responses
- Dates in request bodies should be ISO 8601 format (e.g., `2025-01-15`)
- JWT tokens must be included in the `Authorization` header as `Bearer <token>`
- File uploads use multipart/form-data content type
- All timestamps are in UTC unless specified otherwise