# Analytics & Reporting Documentation

## Table of Contents
1. [Overview](#overview)
2. [Analytics Endpoints](#analytics-endpoints)
3. [Summary Analytics](#summary-analytics)
4. [Chart Data](#chart-data)
5. [Expense Breakdown](#expense-breakdown)
6. [Date Range Presets](#date-range-presets)
7. [MongoDB Aggregation Pipelines](#mongodb-aggregation-pipelines)
8. [Frontend Integration](#frontend-integration)
9. [Calculations Explained](#calculations-explained)

---

## Overview

FinAIlytics provides comprehensive financial analytics through three main endpoints:
- **Summary:** Overall financial health metrics
- **Chart:** Income vs expenses visualization over time
- **Expense Breakdown:** Category-wise expense distribution (pie chart)

---

## Analytics Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/summary` | GET | Financial summary with percentage changes |
| `/api/analytics/chart` | GET | Income vs expenses line chart data |
| `/api/analytics/expense-breakdown` | GET | Expense breakdown by category |

**All endpoints require JWT authentication.**

---

## Summary Analytics

### Endpoint

**GET** `/api/analytics/summary`

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `preset` | string | No | Date range preset |
| `from` | string | No | Custom start date (ISO) |
| `to` | string | No | Custom end date (ISO) |

### Response

```json
{
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
```

### Controller

```typescript
// controllers/analytics.controller.ts
export const summaryAnalyticsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { preset, from, to } = req.query;

    const filter = {
      dateRangePreset: preset as DateRangePreset,
      customFrom: from ? new Date(from as string) : undefined,
      customTo: to ? new Date(to as string) : undefined,
    };

    const stats = await summaryAnalyticsService(
      userId,
      filter.dateRangePreset,
      filter.customFrom,
      filter.customTo
    );

    return res.status(HTTPSTATUS.OK).json({
      message: 'Summary fetched successfully',
      data: stats,
    });
  }
);
```

---

## Chart Data

### Endpoint

**GET** `/api/analytics/chart`

### Query Parameters

Same as summary endpoint.

### Response

```json
{
  "chartData": [
    { "date": "2025-01-01", "income": 5000.00, "expenses": 1200.00 },
    { "date": "2025-01-02", "income": 0, "expenses": 85.50 },
    { "date": "2025-01-03", "income": 1500.00, "expenses": 450.00 }
  ],
  "totalIncomeCount": 3,
  "totalExpenseCount": 15,
  "preset": { ... }
}
```

### Aggregation Pipeline

```typescript
// services/analytics.service.ts
const result = await TransactionModel.aggregate([
  { $match: filter },
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
      income: { $sum: { $cond: [{ $eq: ['$type', 'INCOME'] }, { $abs: '$amount' }, 0] } },
      expenses: { $sum: { $cond: [{ $eq: ['$type', 'EXPENSE'] }, { $abs: '$amount' }, 0] } },
    },
  },
  { $sort: { _id: 1 } },
  { $project: { _id: 0, date: '$_id', income: 1, expenses: 1 } },
]);
```

---

## Expense Breakdown

### Endpoint

**GET** `/api/analytics/expense-breakdown`

### Query Parameters

Same as summary endpoint.

### Response

```json
{
  "totalSpent": 2500.00,
  "breakdown": [
    { "name": "groceries", "value": 800.00, "percentage": 32 },
    { "name": "utilities", "value": 500.00, "percentage": 20 },
    { "name": "entertainment", "value": 400.00, "percentage": 16 },
    { "name": "others", "value": 800.00, "percentage": 32 }
  ],
  "preset": { ... }
}
```

### Aggregation Pipeline

```typescript
// Group by category, get top 3, combine rest as "others"
const pipeline = [
  { $match: { type: 'EXPENSE', ...dateFilter } },
  { $group: { _id: '$category', value: { $sum: '$amount' } } },
  { $sort: { value: -1 } },
  {
    $facet: {
      topThree: [{ $limit: 3 }],
      others: [{ $skip: 3 }, { $group: { _id: 'others', value: { $sum: '$value' } } }],
    },
  },
  { $project: { categories: { $concatArrays: ['$topThree', '$others'] } } },
  { $unwind: '$categories' },
  { $group: { _id: null, totalSpent: { $sum: '$categories.value' }, breakdown: { $push: '$categories' } } },
];
```

---

## Date Range Presets

### Available Presets

| Preset | Label | Description |
|--------|-------|-------------|
| `TODAY` | Today | Current day |
| `YESTERDAY` | Yesterday | Previous day |
| `LAST_7_DAYS` | Last 7 Days | Last 7 days |
| `LAST_30_DAYS` | Last 30 Days | Last 30 days |
| `THIS_MONTH` | This Month | Current month |
| `LAST_MONTH` | Last Month | Previous month |
| `THIS_YEAR` | This Year | Current year |
| `LAST_YEAR` | Last Year | Previous year |
| `ALL_TIME` | All Time | All transactions |

### Implementation

```typescript
// enums/date-range.enum.ts
export enum DateRangeEnum {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_YEAR = 'THIS_YEAR',
  LAST_YEAR = 'LAST_YEAR',
  ALL_TIME = 'ALL_TIME',
}
```

### Date Range Calculation

```typescript
// utils/date.ts
export const getDateRange = (
  preset?: DateRangePreset,
  customFrom?: Date,
  customTo?: Date
): { from: Date; to: Date; value: DateRangeEnum; label: string } => {
  const now = new Date();

  switch (preset) {
    case 'TODAY':
      return { from: startOfDay(now), to: endOfDay(now), value: 'TODAY', label: 'Today' };
    case 'LAST_30_DAYS':
      return { from: subDays(now, 30), to: now, value: 'LAST_30_DAYS', label: 'Last 30 Days' };
    // ... more cases
    default:
      return { from: undefined, to: undefined, value: 'ALL_TIME', label: 'All Time' };
  }
};
```

---

## MongoDB Aggregation Pipelines

### Summary Pipeline

```typescript
const currentPeriodPipeline = [
  { $match: { userId, ...dateFilter } },
  {
    $group: {
      _id: null,
      totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'INCOME'] }, { $abs: '$amount' }, 0] } },
      totalExpenses: { $sum: { $cond: [{ $eq: ['$type', 'EXPENSE'] }, { $abs: '$amount' }, 0] } },
      transactionCount: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      totalIncome: 1,
      totalExpenses: 1,
      transactionCount: 1,
      availableBalance: { $subtract: ['$totalIncome', '$totalExpenses'] },
    },
  },
];
```

### Percentage Change Calculation

```typescript
// Compare with previous period of same duration
const period = differenceInDays(to, from) + 1;
const prevPeriodFrom = isYearly ? subYears(from, 1) : subDays(from, period);
const prevPeriodTo = isYearly ? subYears(to, 1) : subDays(to, period);

// Calculate percentage change
const incomeChange = ((currentIncome - prevIncome) / prevIncome) * 100;
```

---

## Frontend Integration

### API Call

```typescript
// features/analytics/analyticsAPI.ts
export const analyticsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getSummary: builder.query({
      query: (params) => ({
        url: '/analytics/summary',
        params,
      }),
    }),
    getChart: builder.query({
      query: (params) => ({
        url: '/analytics/chart',
        params,
      }),
    }),
    getExpenseBreakdown: builder.query({
      query: (params) => ({
        url: '/analytics/expense-breakdown',
        params,
      }),
    }),
  }),
});
```

### Dashboard Usage

```typescript
// pages/dashboard/index.tsx
const { data: summary } = useGetSummaryQuery({ preset: 'THIS_MONTH' });
const { data: chart } = useGetChartQuery({ preset: 'THIS_MONTH' });
const { data: breakdown } = useGetExpenseBreakdownQuery({ preset: 'THIS_MONTH' });
```

---

## Calculations Explained

### Available Balance

```
Available Balance = Total Income - Total Expenses
```

### Savings Rate

```
Savings Rate = ((Income - Expenses) / Income) * 100

Example: ($15,000 - $2,500) / $15,000 * 100 = 83.33%
```

**Clamped:** -100% to 100% (prevents unrealistic values)

### Expense Ratio

```
Expense Ratio = (Expenses / Income) * 100

Example: $2,500 / $15,000 * 100 = 16.67%
```

**Clamped:** 0% to 100%

### Percentage Change

```
Percentage Change = ((Current - Previous) / |Previous|) * 100

Example: ($5,000 - $4,500) / $4,500 * 100 = 11.11%
```

**Clamped:** -100% to 100%

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Analytics Data Flow                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User selects date range                                                    │
│         │                                                                   │
│         ▼                                                                   │
│  Frontend calls API with preset                                            │
│         │                                                                   │
│         ▼                                                                   │
│  Backend parses preset → date range                                        │
│         │                                                                   │
│         ▼                                                                   │
│  MongoDB aggregation pipeline                                               │
│         │                                                                   │
│         ├──► Summary: Income, Expenses, Balance                            │
│         ├──► Chart: Daily income/expenses                                  │
│         └──► Breakdown: Category totals                                     │
│         │                                                                   │
│         ▼                                                                   │
│  Format and return response                                                │
│         │                                                                   │
│         ▼                                                                   │
│  Frontend displays in cards/charts                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

No additional environment variables required. Analytics use the standard JWT authentication.

---

## Notes

- All monetary values are returned in dollars (stored in cents in DB)
- Dates in responses are ISO 8601 format
- Percentage changes compare to equivalent previous period
- Categories with no transactions show 0%
- "Others" category combines all categories beyond top 3