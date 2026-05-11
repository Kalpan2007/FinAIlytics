# FinAIlytics Backend Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Core Components](#core-components)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Services Layer](#services-layer)
8. [Middleware](#middleware)
9. [Cron Jobs](#cron-jobs)
10. [Configuration](#configuration)
11. [Security](#security)
12. [Error Handling](#error-handling)

---

## Architecture Overview

The FinAIlytics backend follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Express Server                           │
├─────────────────────────────────────────────────────────────────┤
│  Routes → Controllers → Services → Models                      │
│         ↓            ↓           ↓         ↓                    │
│      Validation   Business    Logic     Data                   │
│                   Logic       Layer    Storage                 │
├─────────────────────────────────────────────────────────────────┤
│                    External Integrations                       │
│  ┌──────────┐  ┌────────────┐  ┌────────┐  ┌─────────────┐   │
│  │ MongoDB  │  │ Cloudinary │  │ Gemini │  │   Resend    │   │
│  └──────────┘  └────────────┘  └────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
backend/
├── src/
│   ├── @types/              # TypeScript type definitions
│   │   ├── analytics.type.ts
│   │   ├── index.d.ts       # Global type declarations
│   │   └── report.type.ts
│   │
│   ├── config/              # Configuration modules
│   │   ├── cloudinary.config.ts    # Image upload config
│   │   ├── database.config.ts       # MongoDB connection
│   │   ├── env.config.ts           # Environment variables
│   │   ├── google-ai.config.ts     # Gemini AI setup
│   │   ├── http.config.ts          # HTTP status codes
│   │   ├── passport.config.ts      # JWT strategy
│   │   └── resend.config.ts        # Email service config
│   │
│   ├── controllers/         # Route handlers (HTTP layer)
│   │   ├── analytics.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── report.controller.ts
│   │   ├── transaction.controller.ts
│   │   └── user.controller.ts
│   │
│   ├── cron/               # Scheduled jobs
│   │   ├── index.ts              # Cron initialization
│   │   ├── scheduler.ts          # Node-cron setup
│   │   └── jobs/
│   │       ├── report.job.ts     # Monthly report emails
│   │       └── transaction.job.ts # Recurring transactions
│   │
│   ├── enums/              # TypeScript enums
│   │   ├── date-range.enum.ts
│   │   └── error-code.enum.ts
│   │
│   ├── mailers/            # Email templates & sending
│   │   ├── mailer.ts             # Resend client setup
│   │   ├── report.mailer.ts      # Report email sender
│   │   └── templates/
│   │       └── report.template.ts # Email HTML template
│   │
│   ├── middlewares/        # Express middleware
│   │   ├── asyncHandler.middlerware.ts  # Async wrapper
│   │   └── errorHandler.middleware.ts   # Global error handler
│   │
│   ├── models/             # Mongoose schemas (Data layer)
│   │   ├── report.model.ts
│   │   ├── report-setting.model.ts
│   │   ├── transaction.model.ts
│   │   └── user.model.ts
│   │
│   ├── routes/             # Express routers
│   │   ├── analytics.route.ts
│   │   ├── auth.route.ts
│   │   ├── report.route.ts
│   │   ├── transaction.route.ts
│   │   └── user.route.ts
│   │
│   ├── services/           # Business logic layer
│   │   ├── analytics.service.ts
│   │   ├── auth.service.ts
│   │   ├── report.service.ts
│   │   ├── transaction.service.ts
│   │   └── user.service.ts
│   │
│   ├── utils/              # Helper functions
│   │   ├── app-error.ts         # Custom error classes
│   │   ├── bcrypt.ts            # Password hashing
│   │   ├── date.ts              # Date utilities
│   │   ├── format-currency.ts   # Dollar/cents conversion
│   │   ├── helper.ts            # General helpers
│   │   ├── jwt.ts               # Token generation
│   │   ├── prompt.ts            # AI prompts
│   │   └── get-env.ts           # Env variable getter
│   │
│   ├── validators/         # Zod schemas (Input validation)
│   │   ├── auth.validator.ts
│   │   ├── report.validator.ts
│   │   ├── transaction.validator.ts
│   │   └── user.validator.ts
│   │
│   └── index.ts            # Application entry point
│
├── package.json
├── tsconfig.json
└── .env                    # Environment variables
```

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | ^4.x |
| Language | TypeScript | ^5.x |
| Database | MongoDB | Latest |
| ODM | Mongoose | ^8.x |
| Validation | Zod | ^3.x |
| Authentication | Passport.js (JWT) | ^0.7.x |
| Image Storage | Cloudinary | SDK |
| AI | Google Gemini | SDK |
| Email | Resend | SDK |
| Scheduling | node-cron | ^3.x |
| Utilities | date-fns | ^3.x |

---

## Core Components

### 1. Entry Point (`index.ts`)

The main application file that:
- Creates Express server
- Configures middleware (CORS, JSON parsing, Passport)
- Connects to MongoDB
- Registers all route handlers
- Initializes cron jobs (development only)
- Sets up global error handling

```typescript
// Key setup
app.use(express.json());
app.use(passport.initialize());
app.use(cors({ origin: Env.FRONTEND_ORIGIN, credentials: true }));

// Route registration
app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/user`, passportAuthenticateJwt, userRoutes);
app.use(`${BASE_PATH}/transaction`, passportAuthenticateJwt, transactionRoutes);
app.use(`${BASE_PATH}/report`, passportAuthenticateJwt, reportRoutes);
app.use(`${BASE_PATH}/analytics`, passportAuthenticateJwt, analyticsRoutes);
```

### 2. Controllers

Controllers handle HTTP requests and responses. They:
- Extract and validate input data
- Call appropriate services
- Format and send responses

**Pattern:**
```typescript
export const createTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = createTransactionSchema.parse(req.body);
    const userId = req.user?._id;
    const transaction = await createTransactionService(body, userId);
    return res.status(HTTPSTATUS.CREATED).json({ transaction });
  }
);
```

### 3. Services

Services contain business logic and interact with:
- Database models
- External APIs
- File storage

### 4. Validators

Zod schemas for input validation:
- Type-safe schema definition
- Automatic TypeScript inference
- Built-in error messages

---

## Database Schema

### User Model

```typescript
{
  name: string;          // Required, 1-255 chars
  email: string;         // Required, unique, lowercase
  password: string;      // Required, bcrypt hashed
  profilePicture: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Methods:**
- `comparePassword(password: string): Promise<boolean>`
- `omitPassword(): Omit<UserDocument, "password">`

---

### Transaction Model

```typescript
{
  userId: ObjectId;              // Reference to User
  title: string;                // Required
  type: "INCOME" | "EXPENSE";    // Required
  amount: number;               // Stored in cents, returned in dollars
  category: string;             // Required
  description?: string;
  receiptUrl?: string;
  date: Date;
  paymentMethod: PaymentMethodEnum;
  isRecurring: boolean;
  recurringInterval?: RecurringIntervalEnum;
  nextRecurringDate?: Date;
  lastProcessed?: Date;
  status: TransactionStatusEnum;
  createdAt: Date;
  updatedAt: Date;
}
```

**Enums:**
```typescript
enum TransactionTypeEnum {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE"
}

enum PaymentMethodEnum {
  CARD = "CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  MOBILE_PAYMENT = "MOBILE_PAYMENT",
  AUTO_DEBIT = "AUTO_DEBIT",
  CASH = "CASH",
  OTHER = "OTHER"
}

enum RecurringIntervalEnum {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY"
}
```

---

### Report Model

```typescript
{
  userId: ObjectId;
  sentDate: Date;
  period: string;           // e.g., "December 1 – 31, 2024"
  status: "SENT" | "FAILED" | "NO_ACTIVITY";
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Report Setting Model

```typescript
{
  userId: ObjectId;
  frequency: "WEEKLY" | "MONTHLY";
  isEnabled: boolean;
  nextReportDate: Date;
  lastSentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Routes

### Route Overview

| Prefix | Middleware | Routes |
|--------|------------|--------|
| `/auth` | Public | `/register`, `/login` |
| `/user` | JWT | `/current-user`, `/update` |
| `/transaction` | JWT | `/create`, `/all`, `/:id`, `/update/:id`, `/duplicate/:id`, `/delete/:id`, `/bulk-transaction`, `/bulk-delete`, `/scan-receipt` |
| `/analytics` | JWT | `/summary`, `/chart`, `/expense-breakdown` |
| `/report` | JWT | `/all`, `/generate`, `/update-setting` |

### Authentication Flow

```
User → Register/Login → JWT Generation → Protected Routes
```

---

## Services Layer

### Auth Service

**registerService:**
- Creates new user with hashed password
- Creates default report settings
- Uses MongoDB transactions (with fallback for standalone)

**loginService:**
- Validates credentials
- Generates JWT access token
- Returns user profile and report settings

### Transaction Service

**createTransactionService:**
- Handles recurring logic
- Calculates next recurring date
- Stores amounts in cents

**getAllTransactionService:**
- Keyword search (title, category)
- Type filtering
- Pagination with skip/limit

**scanReceiptService:**
- Uploads image to Cloudinary
- Converts to base64
- Sends to Google Gemini AI
- Parses and returns extracted data

### Analytics Service

**summaryAnalyticsService:**
- Aggregation pipeline for income/expenses
- Calculates savings rate and expense ratio
- Compares with previous period

**chartAnalyticsService:**
- Groups transactions by date
- Returns income vs expenses timeline

**expensePieChartBreakdownService:**
- Groups expenses by category
- Top 3 categories + "others" grouping

### Report Service

**generateReportService:**
- Aggregates transaction data
- Generates insights
- Formats report data

---

## Middleware

### Async Handler

Wraps async route handlers to catch errors and pass to error handler:

```typescript
export const asyncHandler = (fn: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
```

### Error Handler

Global error handling middleware that:
- Catches all unhandled errors
- Formats error responses
- Handles different error types (BadRequest, NotFound, Unauthorized)

### Passport JWT Strategy

```typescript
passport.use('jwt', new JwtStrategy(opts, (payload, done) => {
  // Find user by ID from token payload
  // Return user or false
}));
```

---

## Cron Jobs

### Transaction Job (Every hour)

Processes recurring transactions:
1. Find transactions where `nextRecurringDate <= now`
2. Create new transaction instance
3. Calculate and update next recurring date
4. Handle failures gracefully

### Report Job (Daily at midnight)

Generates and sends monthly reports:
1. Find users with enabled reports where `nextReportDate <= now`
2. Generate report for previous month
3. Send email via Resend
4. Update report history and next report date

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | development/production |
| `PORT` | Yes | Server port (default: 8000) |
| `BASE_PATH` | Yes | API prefix (default: /api) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Access token secret |
| `JWT_EXPIRES_IN` | Yes | Access token expiry |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token expiry |
| `CLOUDINARY_*` | Yes | Cloudinary credentials |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `RESEND_API_KEY` | Yes | Resend API key |
| `FRONTEND_ORIGIN` | Yes | CORS allowed origin |

---

## Security

### Authentication
- JWT-based authentication
- Access tokens (15 min expiry)
- Refresh tokens (7 day expiry)
- HTTP-only cookies for refresh token

### Password Handling
- bcrypt hashing with salt
- Password never stored in plain text
- Password comparison using bcrypt.compare

### Data Protection
- CORS configured for specific origin
- Input validation using Zod
- SQL injection prevention (MongoDB driver)
- XSS prevention (Express.json body parser)

### Best Practices
- Environment variables for secrets
- Rate limiting recommended for production
- HTTPS in production
- Secure cookie settings

---

## Error Handling

### Custom Error Classes

```typescript
class BadRequestException extends AppError {}
class UnauthorizedException extends AppError {}
class NotFoundException extends AppError {}
```

### Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error",
  "error": "Detailed message"
}
```

---

## Development Commands

```bash
npm run dev      # Start with ts-node-dev (hot reload)
npm run build    # Compile TypeScript
npm start        # Run compiled production server
```

---

## Notes

- Amounts stored in cents, converted to dollars on retrieval
- Email addresses normalized to lowercase
- Transactions support both single and bulk operations
- Analytics support date range presets and custom ranges
- Recurring transactions automatically processed by cron job
- Monthly reports automated via Resend emails