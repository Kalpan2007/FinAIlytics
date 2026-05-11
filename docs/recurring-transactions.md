# Recurring Transactions Documentation

## Table of Contents
1. [Overview](#overview)
2. [Data Model](#data-model)
3. [Creating Recurring Transactions](#creating-recurring-transactions)
4. [Processing Recurring Transactions](#processing-recurring-transactions)
5. [Cron Job Implementation](#cron-job-implementation)
6. [Frontend Integration](#frontend-frontend-integration)
7. [Filtering Recurring Transactions](#filtering-recurring-transactions)

---

## Overview

FinAIlytics supports automated recurring transactions that automatically create new transaction instances based on a specified schedule. This feature is ideal for:

- Monthly rent payments
- Subscription services (Netflix, Spotify, etc.)
- Salary deposits
- Utility bill payments

The system uses **node-cron** for scheduled processing and **MongoDB transactions** for data integrity.

---

## Data Model

### Transaction Schema Extensions

```typescript
// models/transaction.model.ts
{
  // ... other fields
  isRecurring: boolean;           // Enable/disable recurrence
  recurringInterval: string;       // DAILY, WEEKLY, MONTHLY, YEARLY
  nextRecurringDate: Date;         // Next occurrence date
  lastProcessed: Date;             // Last time a recurring instance was created
}

// Enums
enum RecurringIntervalEnum {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY"
}
```

### Creation Flow

When a recurring transaction is created:

```typescript
// services/transaction.service.ts
export const createTransactionService = async (
  body: CreateTransactionType,
  userId: string
) => {
  let nextRecurringDate: Date | undefined;

  if (body.isRecurring && body.recurringInterval) {
    // Calculate next occurrence from the transaction date
    const calculatedDate = calculateNextOccurrence(
      body.date,
      body.recurringInterval
    );

    // If calculated date is in the past, calculate from now
    const now = new Date();
    nextRecurringDate = calculatedDate < now
      ? calculateNextOccurrence(now, body.recurringInterval)
      : calculatedDate;
  }

  const transaction = await TransactionModel.create({
    ...body,
    userId,
    nextRecurringDate,
    lastProcessed: null,
  });

  return transaction;
};
```

---

## Creating Recurring Transactions

### API Endpoint

**POST** `/api/transaction/create`

### Request Body

```json
{
  "title": "Netflix Subscription",
  "type": "EXPENSE",
  "amount": 15.99,
  "category": "entertainment",
  "description": "Monthly streaming service",
  "date": "2025-01-15",
  "paymentMethod": "CARD",
  "isRecurring": true,
  "recurringInterval": "MONTHLY"
}
```

### Frontend Form

```typescript
// components/transaction/transaction-form.tsx
<FormField
  control={form.control}
  name="isRecurring"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormLabel>
      <FormLabel className="font-normal">
        Recurring Transaction
      </FormLabel>
    </FormItem>
  )}
/>

{isRecurring && (
  <FormField
    control={form.control}
    name="recurringInterval"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Repeat</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DAILY">Daily</SelectItem>
            <SelectItem value="WEEKLY">Weekly</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="YEARLY">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </FormItem>
    )}
  />
)}
```

---

## Processing Recurring Transactions

### Cron Job

The system runs a cron job **every hour** to process due recurring transactions:

```typescript
// cron/jobs/transaction.job.ts
export const processRecurringTransactions = async () => {
  const now = new Date();
  let processedCount = 0;
  let failedCount = 0;

  try {
    // Find all recurring transactions due for processing
    const cursor = TransactionModel.find({
      isRecurring: true,
      nextRecurringDate: { $lte: now },
    }).cursor();

    for await (const tx of cursor) {
      // Calculate next occurrence
      const nextDate = calculateNextOccurrence(
        tx.nextRecurringDate!,
        tx.recurringInterval!
      );

      // Use MongoDB transaction for atomicity
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // 1. Create a new non-recurring transaction instance
          await TransactionModel.create(
            [{
              ...tx.toObject(),
              _id: new mongoose.Types.ObjectId(),
              title: `Recurring - ${tx.title}`,
              date: tx.nextRecurringDate,
              isRecurring: false,         // This instance is not recurring
              nextRecurringDate: null,    // No next date needed
              recurringInterval: null,    // Clear interval
              lastProcessed: null,       // Clear processed flag
              createdAt: undefined,
              updatedAt: undefined,
            }],
            { session }
          );

          // 2. Update original transaction with next scheduled date
          await TransactionModel.updateOne(
            { _id: tx._id },
            {
              $set: {
                nextRecurringDate: nextDate,
                lastProcessed: now,
              },
            },
            { session }
          );
        });

        processedCount++;
      } catch (error) {
        failedCount++;
        console.log(`Failed recurring tx: ${tx._id}`, error);
      } finally {
        await session.endSession();
      }
    }

    console.log(`✅ Processed: ${processedCount} transactions`);
    console.log(`❌ Failed: ${failedCount} transactions`);
  } catch (error) {
    console.error('Error processing transactions', error);
  }
};
```

---

## Cron Job Implementation

### Scheduler Setup

```typescript
// cron/index.ts
import nodeCron from 'node-cron';

export const initializeCrons = async () => {
  if (process.env.NODE_ENV === 'development') {
    // Process recurring transactions every hour
    nodeCron.schedule('0 * * * *', async () => {
      console.log('Running recurring transaction job...');
      await processRecurringTransactions();
    });

    // Check and send reports daily at midnight
    nodeCron.schedule('0 0 * * *', async () => {
      console.log('Running report job...');
      await processReportJob();
    });

    console.log('Cron jobs initialized');
  }
};
```

### Cron Expression

```
┌───────────── Minute (0 - 59)
│ ┌─────────── Hour (0 - 23)
│ │ ┌───────── Day of Month (1 - 31)
│ │ │ ┌─────── Month (1 - 12)
│ │ │ │ ┌───── Day of Week (0 - 6) (Sunday = 0)
│ │ │ │ │
0 * * * *
│ │ │ │ │
│ │ │ │ └── Every day of the week
│ │ │ └──── Every month
│ │ └────── Every day of the month
└─└──────── At minute 0 (every hour)
```

---

## Frontend Integration

### Filtering Recurring Transactions

Users can filter transactions by recurring status:

```typescript
// Frontend API call
const { data } = useGetTransactionsQuery({
  recurringStatus: 'RECURRING', // or 'NON_RECURRING'
  pageNumber: 1,
  pageSize: 20,
});
```

### Transaction Table Display

The transaction table shows recurring status:

```typescript
// components/transaction/transaction-table/column.tsx
{
  accessorKey: 'isRecurring',
  header: 'Recurring',
  cell: ({ row }) => (
    row.original.isRecurring ? (
      <Badge variant="secondary">
        {row.original.recurringInterval}
      </Badge>
    ) : (
      <span className="text-muted-foreground">-</span>
    )
  ),
}
```

### Duplicate Transaction

Duplicating a recurring transaction creates a **non-recurring** copy:

```typescript
// services/transaction.service.ts
export const duplicateTransactionService = async (...) => {
  const duplicated = await TransactionModel.create({
    ...transaction.toObject(),
    _id: undefined,
    title: `Duplicate - ${transaction.title}`,
    isRecurring: false,  // Clear recurrence
    recurringInterval: undefined,
    nextRecurringDate: undefined,
  });
  return duplicated;
};
```

---

## Filtering Recurring Transactions

### API Endpoint

**GET** `/api/transaction/all`

### Query Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `recurringStatus` | `RECURRING` / `NON_RECURRING` | Filter by recurrence |

### Backend Implementation

```typescript
// services/transaction.service.ts
export const getAllTransactionService = async (
  userId: string,
  filters: { recurringStatus?: 'RECURRING' | 'NON_RECURRING' },
  pagination: { pageSize: number; pageNumber: number }
) => {
  const filterConditions: Record<string, any> = { userId };

  if (filters.recurringStatus) {
    if (filters.recurringStatus === 'RECURRING') {
      filterConditions.isRecurring = true;
    } else if (filters.recurringStatus === 'NON_RECURRING') {
      filterConditions.isRecurring = false;
    }
  }

  const [transactions, totalCount] = await Promise.all([
    TransactionModel.find(filterConditions)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 }),
    TransactionModel.countDocuments(filterConditions),
  ]);

  return { transactions, pagination: { pageSize, pageNumber, totalCount, totalPages, skip } };
};
```

---

## Date Calculation Logic

### Calculate Next Occurrence

```typescript
// utils/helper.ts
export const calculateNextOccurrence = (
  fromDate: Date,
  interval: RecurringIntervalEnum
): Date => {
  const date = new Date(fromDate);

  switch (interval) {
    case 'DAILY':
      date.setDate(date.getDate() + 1);
      break;
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'YEARLY':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
};
```

### Edge Case Handling

```typescript
// When updating a recurring transaction
if (isRecurring && recurringInterval) {
  const calculatedDate = calculateNextOccurrence(date, recurringInterval);
  const now = new Date();

  // If calculated date is in the past, calculate from now
  nextRecurringDate = calculatedDate < now
    ? calculateNextOccurrence(now, recurringInterval)
    : calculatedDate;
}
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   Recurring Transaction Data Flow                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User Creates Recurring Transaction                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │   Frontend  │────►│    Backend   │────►│   MongoDB    │               │
│  │   (Form)    │     │  (Create)    │     │  (Store)     │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
│                                   │                                        │
│                                   ▼                                        │
│                          ┌──────────────┐                                  │
│                          │   Calculate  │                                  │
│                          │  Next Date   │                                  │
│                          └──────────────┘                                  │
│                                                                             │
│  2. Hourly Cron Job                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │   node-cron │────►│    Find Due  │────►│   Process    │               │
│  │  (Schedule) │     │  Transactions│     │ Transactions │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
│                                                │                            │
│                                                ▼                            │
│                                        ┌──────────────┐                     │
│                                        │  MongoDB     │                     │
│                                        │  Transaction │                     │
│                                        └──────────────┘                     │
│                                                │                            │
│                                                ▼                            │
│                                        ┌──────────────┐                     │
│                                        │  Update Next │                     │
│                                        │    Date      │                     │
│                                        └──────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

No additional environment variables required. Recurring transactions use the standard MongoDB connection.

---

## Notes

- Recurring transactions are processed hourly via cron job
- Each occurrence creates an **independent** non-recurring transaction
- The original transaction remains as a template for future occurrences
- All amounts are stored in cents, converted to dollars on display
- Recurring status can be toggled on/off when editing a transaction
- Users can filter transactions to see only recurring or non-recurring