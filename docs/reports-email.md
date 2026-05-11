# Reports & Email Documentation

## Table of Contents
1. [Overview](#overview)
2. [Report Generation](#report-generation)
3. [Email Delivery](#email-delivery)
4. [Automated Reports](#automated-reports)
5. [Cron Jobs](#cron-jobs)
6. [Frontend Integration](#frontend-integration)
7. [Report Settings](#report-settings)
8. [Email Templates](#email-templates)

---

## Overview

FinAIlytics provides two types of reports:

1. **On-demand Reports:** Users can generate reports for any date range
2. **Automated Reports:** Scheduled monthly/weekly emails with financial summaries

Both types leverage **Resend** for email delivery and **MongoDB aggregation** for data processing.

---

## Report Generation

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/report/all` | GET | Get report history with pagination |
| `/api/report/generate` | GET | Generate on-demand report |
| `/api/report/update-setting` | PUT | Update auto-report settings |

### Get All Reports

**GET** `/api/report/all`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pageNumber` | integer | 1 | Page number |
| `pageSize` | integer | 20 | Items per page |

**Response:**
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

### Generate Report On-Demand

**GET** `/api/report/generate`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | No | Start date (ISO) |
| `to` | string | No | End date (ISO) |

**Default:** If `from` is not provided, defaults to last 30 days.

**Response:**
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

### Controller Implementation

```typescript
// controllers/report.controller.ts
export const generateReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { from, to } = req.query as { from?: string; to?: string };

    let toDate = parseDate(to) ?? new Date();
    let fromDate = parseDate(from);

    if (!fromDate) {
      fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 30); // Default: last 30 days
    }

    if (fromDate > toDate) {
      [fromDate, toDate] = [toDate, fromDate]; // Swap if reversed
    }

    const result = await generateReportService(userId, fromDate, toDate);

    return res.status(HTTPSTATUS.OK).json({
      message: 'Report generated successfully',
      ...result,
    });
  }
);
```

---

## Email Delivery

### Service

**Resend** is used for transactional email delivery.

### Configuration

```typescript
// config/resend.config.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email sender address
export const MAILER_SENDER = process.env.RESEND_MAILER_SENDER || 'no-reply@yourdomain.com';
```

### Sending Report Email

```typescript
// mailers/report.mailer.ts
import { resend, MAILER_SENDER } from '../config/resend.config';

export const sendReportEmail = async ({
  email,
  username,
  report,
  frequency,
}: ReportEmailParams) => {
  const html = generateReportEmailTemplate(username, report, frequency);

  await resend.emails.send({
    from: MAILER_SENDER,
    to: email,
    subject: `Your ${frequency === 'WEEKLY' ? 'Weekly' : 'Monthly'} Financial Report`,
    html,
  });
};
```

---

## Automated Reports

### Report Settings

Users can configure automatic report generation:

```typescript
// models/report-setting.model.ts
{
  userId: ObjectId;
  frequency: 'WEEKLY' | 'MONTHLY';
  isEnabled: boolean;
  nextReportDate: Date;
  lastSentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Update Settings

**PUT** `/api/report/update-setting`

**Request:**
```json
{
  "isEnabled": true,
  "frequency": "MONTHLY"
}
```

**Response:**
```json
{
  "message": "Reports setting updated successfully"
}
```

---

## Cron Jobs

### Initialization

```typescript
// cron/index.ts
import nodeCron from 'node-cron';

export const initializeCrons = async () => {
  if (process.env.NODE_ENV === 'development') {
    // Process recurring transactions every hour
    nodeCron.schedule('0 * * * *', async () => {
      await processRecurringTransactions();
    });

    // Check and send reports daily at midnight
    nodeCron.schedule('0 0 * * *', async () => {
      await processReportJob();
    });

    console.log('Cron jobs initialized');
  }
};
```

### Report Job

```typescript
// cron/jobs/report.job.ts
export const processReportJob = async () => {
  const now = new Date();
  const from = startOfMonth(subMonths(now, 1)); // Last month
  const to = endOfMonth(subMonths(now, 1));

  const settings = await ReportSettingModel.find({
    isEnabled: true,
    nextReportDate: { $lte: now },
  }).populate('userId');

  for (const setting of settings) {
    // 1. Generate report for last month
    const report = await generateReportService(user.id, from, to);

    // 2. Send email
    await sendReportEmail({
      email: user.email,
      username: user.name,
      report: { ... },
      frequency: setting.frequency,
    });

    // 3. Update next report date
    await ReportSettingModel.updateOne(
      { _id: setting._id },
      {
        lastSentDate: now,
        nextReportDate: calculateNextReportDate(now),
      }
    );

    // 4. Log to report history
    await ReportModel.create({
      userId: user.id,
      sentDate: now,
      period: `${format(from, 'MMMM d')} – ${format(to, 'd, yyyy')}`,
      status: 'SENT',
    });
  }
};
```

### Helper Functions

```typescript
// utils/helper.ts
export const calulateNextReportDate = (from: Date = new Date()): Date => {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  return startOfDay(next);
};
```

---

## Frontend Integration

### API Calls

```typescript
// features/report/reportAPI.ts
export const reportApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getAllReports: builder.query({
      query: (params) => ({
        url: '/report/all',
        params,
      }),
    }),
    generateReport: builder.query({
      query: (params) => ({
        url: '/report/generate',
        params,
      }),
    }),
    updateReportSetting: builder.mutation({
      query: (body) => ({
        url: '/report/update-setting',
        method: 'PUT',
        body,
      }),
    }),
  }),
});
```

### Usage in Reports Page

```typescript
// pages/reports/index.tsx
const { data: reports } = useGetAllReportsQuery({ pageNumber: 1, pageSize: 20 });
const { data: currentReport } = useGenerateReportQuery({ from, to });
const [updateSetting] = useUpdateReportSettingMutation();
```

---

## Email Templates

### HTML Template

```typescript
// mailers/templates/report.template.ts
export const generateReportEmailTemplate = (
  username: string,
  report: ReportData,
  frequency: string
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 30px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { flex: 1; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #111; }
        .stat-label { color: #666; font-size: 14px; }
        .insights { margin: 20px 0; }
        .insight { padding: 10px; background: #EEF2FF; border-left: 3px solid #4F46E5; margin: 10px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Your ${frequency === 'WEEKLY' ? 'Weekly' : 'Monthly'} Financial Report</h1>
          <p>Hello ${username}, here's your financial summary!</p>
        </div>

        <h2>📊 Summary</h2>
        <div class="summary">
          <div class="stat">
            <div class="stat-value">$${report.totalIncome.toLocaleString()}</div>
            <div class="stat-label">Total Income</div>
          </div>
          <div class="stat">
            <div class="stat-value">$${report.totalExpenses.toLocaleString()}</div>
            <div class="stat-label">Total Expenses</div>
          </div>
          <div class="stat">
            <div class="stat-value">$${report.availableBalance.toLocaleString()}</div>
            <div class="stat-label">Available Balance</div>
          </div>
        </div>

        <h2>💡 Insights</h2>
        <div class="insights">
          ${report.insights.map(i => `<div class="insight">${i}</div>`).join('')}
        </div>

        <div class="footer">
          <p>Sent by FinAIlytics • <a href="https://yourapp.com">View in App</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Report & Email Data Flow                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │  On-Demand     │                    ┌─────────────────┐                │
│  │  Generation    │─── GET ───────────►│   Backend      │                │
│  └─────────────────┘                    │   /report/     │                │
│                                          │   generate     │                │
│                                          └────────┬────────┘                │
│                                                   │                         │
│                                                   ▼                         │
│                                          ┌─────────────────┐                │
│                                          │ Aggregation     │                │
│                                          │ Pipeline         │                │
│                                          └────────┬────────┘                │
│                                                   │                         │
│                                                   ▼                         │
│                                          ┌─────────────────┐                │
│                                          │ Return Report   │                │
│                                          │ JSON             │                │
│                                          └────────┬────────┘                │
│                                                   │                         │
└───────────────────────────────────────────────────┼─────────────────────────┘
                                                    │
┌───────────────────────────────────────────────────┼─────────────────────────┐
│                   Automated (Cron)                │                         │
│                                                   ▼                         │
│  ┌─────────────────┐                    ┌─────────────────┐                │
│  │  Cron Job       │─── Run ───────────►│  Find Due       │                │
│  │  (Midnight)     │                    │  Reports         │                │
│  └─────────────────┘                    └────────┬────────┘                │
│                                                   │                         │
│                                                   ▼                         │
│                                          ┌─────────────────┐                │
│                                          │ Generate        │                │
│                                          │ For Last Month  │                │
│                                          └────────┬────────┘                │
│                                                   │                         │
│                                                   ▼                         │
│                                          ┌─────────────────┐                │
│                                          │ Send Email      │                │
│                                          │ via Resend      │                │
│                                          └────────┬────────┘                │
│                                                   │                         │
│                                                   ▼                         │
│                                          ┌─────────────────┐                │
│                                          │ Update Settings │                │
│                                          │ & Log History   │                │
│                                          └─────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

```env
# Resend
RESEND_API_KEY=re_123456789
RESEND_MAILER_SENDER=no-reply@yourdomain.com
```

---

## Notes

- Automated reports run at midnight daily
- Reports are generated for the previous month (for MONTHLY frequency)
- Email history is stored in the Report model
- Users can enable/disable auto-reports via settings
- Report generation includes financial insights generated by the service
- Fallback handles cases with no transaction activity