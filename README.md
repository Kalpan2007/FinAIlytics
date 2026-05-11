# FinAIlytics

<div align="center">

### AI-Powered Personal Finance Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Track. Analyze. Save.** — The intelligent way to manage your personal finances with AI-powered receipt scanning, automated insights, and beautiful analytics.

[Features](#features) • [Tech Stack](#tech-stack) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## Why FinAIlytics?

Traditional budgeting apps are tedious. FinAIlytics uses AI to automate the boring stuff:

- 📸 **Snap & Go** — Upload receipts, let AI extract the details
- 📊 **Visual Insights** — Beautiful charts show where your money goes
- 🔄 **Auto-Tracking** — Recurring payments handled automatically
- 📧 **Stay Informed** — Monthly reports delivered to your inbox

---

## Features

### 🔐 Authentication & Security
- Email/password authentication with bcrypt password hashing
- JWT-based sessions with access (15min) and refresh (7d) tokens
- Secure HTTP-only cookies for refresh tokens
- Protected routes with Passport.js JWT strategy

### 💳 Transaction Management
- **CRUD Operations** — Create, read, update, delete transactions
- **Duplicate Transactions** — One-click duplication
- **Bulk Import** — CSV import supporting up to 300 transactions
- **Advanced Filtering** — By type (income/expense), keyword, recurring status
- **Pagination** — Efficient list handling with configurable page sizes

### 🤖 AI-Powered Receipt Scanning
- Upload receipt images (JPEG/PNG, max 2MB)
- Google Gemini 2.0 Flash extracts: title, amount, date, category, payment method
- Cloudinary handles image storage and retrieval
- Review extracted data before saving

### 📊 Analytics Dashboard
- **Summary Cards** — Available balance, total income, total expenses
- **Savings Rate** — Percentage of income saved (clamped -100% to 100%)
- **Percentage Changes** — Compare current vs previous period
- **Line Chart** — Income vs expenses over time
- **Pie Chart** — Category breakdown (top 3 + others)
- **Date Range Presets** — Today, Last 7/30 days, This/Last month, This/Last year, All time

### 📈 Reports & Email
- **On-Demand Reports** — Generate for any custom date range
- **Automated Reports** — Weekly or monthly via Resend email
- **Report History** — View past sent reports
- **Configurable Settings** — Enable/disable, set frequency

### 🔄 Recurring Transactions
- **Intervals** — Daily, Weekly, Monthly, Yearly
- **Auto-Processing** — Cron job runs hourly to create instances
- **Smart Scheduling** — Automatically calculates next occurrence

### 🎨 UI/UX
- **Dark/Light Theme** — Toggle via settings
- **Responsive Design** — Works on mobile and desktop
- **Modern Components** — Built with shadcn/ui and Radix UI
- **Loading States** — Skeleton loaders for better UX

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Vite | Build Tool |
| TypeScript | Type Safety |
| Redux Toolkit + RTK Query | State Management & Data Fetching |
| TailwindCSS | Styling |
| shadcn/ui + Radix UI | Component Library |
| Recharts | Data Visualization |
| React Router DOM | Routing |
| React Hook Form + Zod | Form Handling |
| date-fns | Date Utilities |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express.js | Web Framework |
| TypeScript | Language |
| MongoDB + Mongoose | Database |
| Passport.js (JWT) | Authentication |
| Zod | Input Validation |
| node-cron | Job Scheduling |

### External Services

| Service | Purpose |
|---------|---------|
| Google Gemini 2.0 Flash | AI Receipt Scanning |
| Cloudinary | Image Storage & CDN |
| Resend | Transactional Email |

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (for receipts)
- Google Gemini API key (for AI)
- Resend API key (for emails, optional in dev)

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/finailytics.git
cd finailytics

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Environment Configuration

#### Backend (`.env`)

```env
NODE_ENV=development
PORT=8000
BASE_PATH=/api

# MongoDB
MONGO_URI=mongodb://localhost:27017/finailytics

# JWT
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google AI
GEMINI_API_KEY=your_gemini_api_key

# Email (optional in dev)
RESEND_API_KEY=your_resend_api_key
RESEND_MAILER_SENDER=no-reply@yourdomain.com

# CORS
FRONTEND_ORIGIN=http://localhost:5173
```

#### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:8000/api
```

### Run the Application

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:5173

---

## Project Structure

```
finailytics/
├── docs/                    # Detailed documentation
│   ├── api_documentation.md    # Complete API reference
│   ├── backend.md             # Backend architecture
│   ├── frontend.md            # Frontend architecture
│   ├── authentication.md      # Auth flow details
│   ├── ocr-receipt-scanning.md # AI receipt scanning
│   ├── ai-integration.md      # Google Gemini integration
│   ├── analytics.md           # Analytics & reporting
│   ├── reports-email.md       # Email reports
│   └── recurring-transactions.md # Recurring transactions
│
├── backend/                 # Express + TypeScript API
│   └── src/
│       ├── controllers/     # Route handlers
│       ├── services/       # Business logic
│       ├── models/         # Mongoose schemas
│       ├── routes/         # Express routers
│       ├── config/         # Configuration
│       ├── middlewares/    # Express middleware
│       ├── validators/     # Zod schemas
│       ├── utils/          # Helpers
│       ├── cron/           # Scheduled jobs
│       └── mailers/        # Email handling
│
└── client/                 # React + Vite frontend
    └── src/
        ├── pages/         # Route pages
        ├── components/   # UI components
        ├── features/      # RTK Query API slices
        ├── hooks/        # Custom hooks
        ├── layouts/      # Layout components
        ├── routes/      # Routing config
        └── lib/          # Utilities
```

---

## Documentation

For detailed documentation, see the [`docs/`](docs/) folder:

| Document | Description |
|----------|-------------|
| [`docs/api_documentation.md`](docs/api_documentation.md) | Complete API reference with all endpoints, request/response formats |
| [`docs/backend.md`](docs/backend.md) | Backend architecture, folder structure, database schema |
| [`docs/frontend.md`](docs/frontend.md) | Frontend pages, components, state management |
| [`docs/authentication.md`](docs/authentication.md) | JWT authentication flow, token management |
| [`docs/ocr-receipt-scanning.md`](docs/ocr-receipt-scanning.md) | AI receipt scanning workflow |
| [`docs/ai-integration.md`](docs/ai-integration.md) | Google Gemini AI configuration |
| [`docs/analytics.md`](docs/analytics.md) | Analytics endpoints, aggregation pipelines |
| [`docs/reports-email.md`](docs/reports-email.md) | Report generation, automated emails |
| [`docs/recurring-transactions.md`](docs/recurring-transactions.md) | Recurring transaction processing |

---

## API Endpoints Overview

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in

### User
- `GET /api/user/current-user` — Get profile
- `PUT /api/user/update` — Update profile

### Transactions
- `POST /api/transaction/create` — New transaction
- `GET /api/transaction/all` — List (paginated)
- `GET /api/transaction/:id` — Get one
- `PUT /api/transaction/update/:id` — Update
- `PUT /api/transaction/duplicate/:id` — Duplicate
- `DELETE /api/transaction/delete/:id` — Delete
- `POST /api/transaction/bulk-transaction` — CSV import
- `DELETE /api/transaction/bulk-delete` — Bulk delete
- `POST /api/transaction/scan-receipt` — AI scan

### Analytics
- `GET /api/analytics/summary` — Financial summary
- `GET /api/analytics/chart` — Chart data
- `GET /api/analytics/expense-breakdown` — Pie chart data

### Reports
- `GET /api/report/all` — Report history
- `GET /api/report/generate` — Generate report
- `PUT /api/report/update-setting` — Configure auto-reports

---

## Scripts

### Backend

```bash
npm run dev    # Development with hot reload
npm run build  # Compile TypeScript
npm start      # Run production build
```

### Frontend

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production
```

---

## Security Considerations

> **Important:** Never commit real API keys or secrets to version control.

- All secrets stored in `.env` files (gitignored)
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with short expiry (15 min)
- CORS configured for specific origin only
- Input validation with Zod prevents malformed data
- MongoDB query injection prevention
- HTTPS recommended for production

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on auth from localhost:5173 | Ensure `VITE_API_URL=http://localhost:8000/api` in client/.env |
| "Transaction numbers are only allowed on a replica set" | Use MongoDB replica set or code fallback handles it automatically |
| Login says "Email/password not found" | Email normalized to lowercase; check exact email used at signup |
| Savings rate unrealistic | Values clamped to -100% to 100% for realism |

---

## License

MIT License — feel free to use for personal or commercial projects.

---

## Contributing

Contributions welcome! Please open an issue or submit a PR.

---

<div align="center">

**If you find this useful, please give it a ⭐**

Made with 💻 and ☕

</div>