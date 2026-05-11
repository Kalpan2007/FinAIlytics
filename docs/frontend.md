# FinAIlytics Frontend Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Page Components](#page-components)
5. [UI Components](#ui-components)
6. [State Management](#state-management)
7. [Routing](#routing)
8. [API Integration](#api-integration)
9. [Key Features Implementation](#key-features-implementation)
10. [Utilities & Helpers](#utilities--helpers)

---

## Architecture Overview

The FinAIlytics frontend is built with **React 18** using **Vite** for fast development. It follows a feature-based folder organization with **Redux Toolkit Query (RTK Query)** for data fetching and caching.

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                        │
├─────────────────────────────────────────────────────────────────┤
│  Pages → Components ← Hooks                                    │
│    ↓       ↓        ↓                                          │
│  Views   UI Lib   Custom Logic                                 │
├─────────────────────────────────────────────────────────────────┤
│                     State Management                            │
│         Redux Store → RTK Query API Slices                     │
├─────────────────────────────────────────────────────────────────┤
│                      API Client                                  │
│            axios/fetch → Backend Server                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
client/
├── src/
│   ├── @types/                 # TypeScript type definitions
│   │   └── transaction.type.ts
│   │
│   ├── app/                    # Application setup
│   │   ├── api-client.ts       # RTK Query base configuration
│   │   ├── hook.ts             # Typed Redux hooks
│   │   └── store.ts            # Redux store configuration
│   │
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── currency-input.tsx
│   │   │   ├── pagination.tsx
│   │   │   └── ... (30+ more)
│   │   │
│   │   ├── data-table/         # Reusable data table
│   │   │   ├── index.tsx
│   │   │   ├── table-pagination.tsx
│   │   │   └── table-skeleton-loader.tsx
│   │   │
│   │   ├── date-range-picker/  # Date range picker
│   │   │   └── index.tsx
│   │   │
│   │   ├── date-range-select/ # Quick date presets
│   │   │   └── index.tsx
│   │   │
│   │   ├── empty-state/        # Empty state display
│   │   │   └── index.tsx
│   │   │
│   │   ├── footer/            # App footer
│   │   │   └── index.tsx
│   │   │
│   │   ├── logo/              # App logo
│   │   │   └── logo.tsx
│   │   │
│   │   ├── navbar/            # Navigation bar
│   │   │   ├── index.tsx
│   │   │   ├── user-nav.tsx
│   │   │   └── logout-dialog.tsx
│   │   │
│   │   ├── page-header.tsx
│   │   ├── page-layout.tsx
│   │   ├── app-alert.tsx
│   │   │
│   │   └── transaction/       # Transaction-specific components
│   │       ├── transaction-table/
│   │       │   ├── index.tsx
│   │       │   ├── column.tsx
│   │       │   └── data.ts
│   │       ├── transaction-form.tsx
│   │       ├── add-transaction-drawer.tsx
│   │       ├── edit-transaction-drawer.tsx
│   │       ├── import-transaction-modal/
│   │       │   ├── index.tsx
│   │       │   ├── fileupload-step.tsx
│   │       │   ├── column-mapping-step.tsx
│   │       │   └── confirmation-step.tsx
│   │       └── reciept-scanner.tsx
│   │
│   ├── constant/              # App constants & enums
│   │   └── index.ts
│   │
│   ├── context/               # React context providers
│   │   └── theme-provider.tsx # Dark/light theme context
│   │
│   ├── features/              # Feature-based API slices
│   │   ├── auth/
│   │   │   ├── authAPI.ts
│   │   │   ├── authSlice.ts
│   │   │   └── authType.ts
│   │   ├── transaction/
│   │   │   ├── transactionAPI.ts
│   │   │   └── transationType.ts
│   │   ├── analytics/
│   │   │   └── analyticsAPI.ts
│   │   ├── user/
│   │   │   ├── userAPI.ts
│   │   │   └── userType.ts
│   │   └── report/
│   │       ├── reportAPI.ts
│   │       └── reportType.ts
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-auth-expiration.ts
│   │   ├── use-debounce-search.ts
│   │   ├── use-edit-transaction-drawer.ts
│   │   ├── use-mobile.ts
│   │   └── use-progress-loader.ts
│   │
│   ├── layouts/               # Layout components
│   │   ├── base-layout.tsx    # Auth pages layout
│   │   └── app-layout.ts      # Protected pages layout
│   │
│   ├── lib/                   # Utility functions
│   │   ├── utils.ts           # General utilities
│   │   ├── format-currency.ts
│   │   └── format-percentage.ts
│   │
│   ├── pages/                 # Route pages
│   │   ├── auth/
│   │   │   ├── sign-in.tsx
│   │   │   ├── sign-up.tsx
│   │   │   └── _component/
│   │   │       ├── signin-form.tsx
│   │   │       └── signup-form.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── index.tsx
│   │   │   ├── dashboard-summary.tsx
│   │   │   ├── dashboard-data-chart.tsx
│   │   │   ├── expense-pie-chart.tsx
│   │   │   ├── dashboard-recent-transactions.tsx
│   │   │   └── _component/
│   │   │       ├── dashboard-header.tsx
│   │   │       ├── dashboard-stats.tsx
│   │   │       └── summary-card.tsx
│   │   │
│   │   ├── transactions/
│   │   │   └── index.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── index.tsx
│   │   │   └── _component/
│   │   │       ├── column.tsx
│   │   │       ├── data.ts
│   │   │       ├── report-table.tsx
│   │   │       ├── schedule-report-drawer.tsx
│   │   │       └── schedule-report-form.tsx
│   │   │
│   │   └── settings/
│   │       ├── index.tsx
│   │       ├── account.tsx
│   │       ├── appearance.tsx
│   │       ├── billing.tsx
│   │       └── _components/
│   │           ├── account-form.tsx
│   │           ├── appearance-theme.tsx
│   │           └── billing-plan-card.tsx
│   │
│   ├── routes/                # Routing configuration
│   │   ├── index.tsx          # Main router
│   │   ├── protectedRoute.tsx
│   │   ├── authRoute.tsx
│   │   └── common/
│   │       ├── routePath.tsx  # Route paths
│   │       └── routes.tsx     # Route definitions
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css              # Global styles + Tailwind
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── index.html
```

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Language | TypeScript | 5.x |
| State Management | Redux Toolkit + RTK Query | 2.x |
| Styling | TailwindCSS | 3.x |
| UI Components | shadcn/ui + Radix UI | Latest |
| Charts | Recharts | 2.x |
| Routing | React Router DOM | 6.x |
| Form Handling | React Hook Form + Zod | 7.x / 3.x |
| Notifications | Sonner | Latest |
| Date Handling | date-fns | 3.x |

---

## Page Components

### Authentication Pages

| Page | Route | Description |
|------|-------|-------------|
| `SignIn` | `/signin` | User login with email/password |
| `SignUp` | `/signup` | User registration |

**Features:**
- Form validation with Zod
- Error handling and display
- Loading states
- Redirect to dashboard on success

---

### Dashboard Page

**Route:** `/dashboard`

**Components:**
- `dashboard-summary.tsx` - Financial overview cards
- `dashboard-data-chart.tsx` - Income vs expenses line chart
- `expense-pie-chart.tsx` - Category breakdown pie chart
- `dashboard-recent-transactions.tsx` - Latest 5 transactions

**Features:**
- Date range selector
- Real-time data fetching
- Percentage change indicators
- Savings rate display

---

### Transactions Page

**Route:** `/transactions`

**Components:**
- `transaction-table/index.tsx` - Paginated transaction list
- `add-transaction-drawer.tsx` - Create new transaction form
- `import-transaction-modal/` - CSV import wizard (3 steps)

**Features:**
- Keyword search
- Type filtering (income/expense)
- Recurring status filter
- Bulk selection and delete
- Duplicate transaction
- CSV import with column mapping

---

### Reports Page

**Route:** `/reports`

**Components:**
- `report-table.tsx` - Sent reports history
- `schedule-report-form.tsx` - Configure auto-reports

**Features:**
- View report history
- Enable/disable auto-reports
- Set frequency (weekly/monthly)
- Generate on-demand reports

---

### Settings Pages

**Routes:**
- `/settings` - Main settings (redirects to account)
- `/settings/account` - Profile management
- `/settings/appearance` - Theme toggle
- `/settings/billing` - Subscription info

**Components:**
- `account-form.tsx` - Update name, email, profile picture
- `appearance-theme.tsx` - Dark/light mode toggle
- `billing-plan-card.tsx` - Plan details display

---

## UI Components

### Core Components (shadcn/ui)

| Component | Usage |
|----------|-------|
| `Button` | Primary actions, loading states |
| `Input` | Text fields, number inputs |
| `CurrencyInput` | Formatted currency input |
| `Select` | Dropdown selections |
| `Dialog` | Modal dialogs |
| `Drawer` | Slide-out panels (add/edit forms) |
| `Table` | Data tables with sorting |
| `Card` | Content containers |
| `Calendar` | Date picker |
| `Chart` | Data visualization |
| `Pagination` | Page navigation |
| `Badge` | Status indicators |
| `Avatar` | User profile images |
| `Switch` | Toggle controls |
| `Tabs` | Content switching |
| `Toast/Sonner` | Notifications |
| `Skeleton` | Loading placeholders |

### Custom Components

| Component | Description |
|-----------|-------------|
| `PageLayout` | Standard page wrapper with header/actions |
| `TransactionTable` | Full-featured transaction list |
| `AddTransactionDrawer` | Create transaction slide-out |
| `EditTransactionDrawer` | Edit transaction slide-out |
| `ImportTransactionModal` | 3-step CSV import wizard |
| `ReceiptScanner` | AI receipt upload component |
| `DateRangePicker` | Custom date range selection |
| `DateRangeSelect` | Quick preset date buttons |
| `UserNav` | User avatar dropdown in navbar |

---

## State Management

### Redux Store Structure

```typescript
interface RootState {
  auth: {
    user: User | null;
    accessToken: string | null;
    expiresAt: string | null;
    isAuthenticated: boolean;
    reportSetting: ReportSetting | null;
  };
  api: RTKQueryReducerPath;  // Added by RTK Query
}
```

### Auth Slice

Manages authentication state:
- User profile
- Access token
- Token expiration
- Report settings
- Login/logout actions

### RTK Query API Client

```typescript
// Base query with auth header injection
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});
```

**Tag Types:**
- `transactions` - Cache transaction data
- `analytics` - Cache analytics data
- `billingSubscription` - Cache billing data
- `reports` - Cache report data

---

## Routing

### Route Structure

```
Routes
├── AuthRoute (unauthenticated)
│   └── BaseLayout
│       ├── /signin
│       └── /signup
│
└── ProtectedRoute (authenticated)
    └── AppLayout
        ├── /dashboard
        ├── /transactions
        ├── /reports
        └── /settings
            ├── /account
            ├── /appearance
            └── /billing
```

### Route Configuration

```typescript
// protectedRoutePaths
{
  path: "/dashboard",
  element: <Dashboard />,
},
{
  path: "/transactions",
  element: <Transactions />,
},
{
  path: "/reports",
  element: <Reports />,
},
{
  path: "/settings",
  children: [
    { path: "/account", element: <SettingsAccount /> },
    { path: "/appearance", element: <SettingsAppearance /> },
    { path: "/billing", element: <SettingsBilling /> },
  ],
},
```

---

## API Integration

### Auth API

```typescript
// Endpoints
register: POST /auth/register
login: POST /auth/login
logout: POST /auth/logout
refresh: POST /auth/refresh-token
```

### Transaction API

```typescript
// Endpoints
createTransaction: POST /transaction/create
getAllTransactions: GET /transaction/all
getSingleTransaction: GET /transaction/:id
updateTransaction: PUT /transaction/update/:id
duplicateTransaction: PUT /transaction/duplicate/:id
deleteTransaction: DELETE /transaction/delete/:id
bulkImportTransaction: POST /transaction/bulk-transaction
bulkDeleteTransaction: DELETE /transaction/bulk-delete
aiScanReceipt: POST /transaction/scan-receipt
```

### Analytics API

```typescript
// Endpoints
getSummary: GET /analytics/summary
getChartData: GET /analytics/chart
getExpenseBreakdown: GET /analytics/expense-breakdown
```

### Report API

```typescript
// Endpoints
getAllReports: GET /report/all
generateReport: GET /report/generate
updateReportSetting: PUT /report/update-setting
```

### User API

```typescript
// Endpoints
getCurrentUser: GET /user/current-user
updateUser: PUT /user/update
```

---

## Key Features Implementation

### 1. Authentication Flow

1. User enters credentials in sign-in/sign-up form
2. API call to `/auth/register` or `/auth/login`
3. Store access token in Redux state
4. RTK Query adds token to all subsequent requests
5. `useAuthExpiration` hook monitors token expiry
6. Auto-refresh or redirect to login on expiry

### 2. Transaction Management

**Create:**
- Drawer component opens with form
- Form validates with Zod
- API creates transaction
- Cache invalidated to refetch list

**Edit:**
- Click row to open edit drawer
- Pre-populated form loads data
- Update triggers cache invalidation

**Import CSV:**
- Step 1: Upload CSV file
- Step 2: Map columns to fields
- Step 3: Preview and confirm
- Bulk insert up to 300 transactions

### 3. AI Receipt Scanning

1. User uploads receipt image
2. FormData sent to `/transaction/scan-receipt`
3. Backend uploads to Cloudinary
4. Gemini AI extracts transaction data
5. Pre-filled form shown to user
6. User confirms and saves

### 4. Analytics Visualization

- Summary cards show key metrics
- Line chart shows income vs expenses over time
- Pie chart shows expense breakdown by category
- Date range selector updates all charts
- Percentage changes compare to previous period

### 5. Theme Switching

- `ThemeProvider` wraps the app
- Uses CSS variables for colors
- `appearance.tsx` toggles dark/light
- Persists preference in localStorage

---

## Utilities & Helpers

### Format Currency

```typescript
formatCurrency(amount: number, currency = "USD"): string
// Usage: formatCurrency(1234.56) → "$1,234.56"
```

### Format Percentage

```typescript
formatPercentage(value: number): string
// Usage: formatPercentage(83.33) → "83.33%"
```

### Date Utilities

- Date range presets (TODAY, LAST_7_DAYS, etc.)
- Custom date range picker
- Date formatting utilities (via date-fns)

---

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useAuthExpiration` | Monitor token expiry, auto-refresh |
| `useDebounceSearch` | Debounce search input |
| `useEditTransactionDrawer` | Manage edit drawer state |
| `useMobile` | Detect mobile viewport |
| `useProgressLoader` | Loading state management |

---

## Environment Variables

```env
VITE_API_URL=http://localhost:8000/api
```

**Note:** The `/api` suffix is automatically added if not present in the URL.

---

## Development Commands

```bash
npm run dev      # Start Vite dev server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## Notes

- All API calls go through RTK Query for caching
- Auth token automatically included in headers
- Credentials set to "include" for cookie handling
- Error responses handled globally
- Loading states managed per component
- Optimistic updates for better UX