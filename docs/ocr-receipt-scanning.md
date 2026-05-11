# OCR Receipt Scanning Documentation

## Table of Contents
1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [AI Processing](#ai-processing)
6. [Supported Formats](#supported-formats)
7. [Response Handling](#response-handling)
8. [Error Scenarios](#error-scenarios)

---

## Overview

FinAIlytics provides AI-powered receipt scanning that allows users to:
- Upload a photo of a receipt
- Automatically extract transaction details using Google Gemini AI
- Review and save the extracted data as a transaction

This feature eliminates manual data entry and ensures accurate transaction recording.

---

## How It Works

```
User uploads receipt image
        ↓
Upload to Cloudinary (image hosting)
        ↓
Convert image to base64
        ↓
Send to Google Gemini AI with prompt
        ↓
Parse AI response (JSON)
        ↓
Return extracted data to frontend
        ↓
User reviews and confirms
        ↓
Create transaction in database
```

---

## Backend Implementation

### API Endpoint

**POST** `/api/transaction/scan-receipt`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receipt` | file | Yes | Image file (JPEG/PNG) |

**Max file size:** 2MB

### Route Definition

```typescript
// routes/transaction.route.ts
transactionRoutes.post(
  '/scan-receipt',
  upload.single('receipt'),
  scanReceiptController
);
```

### Controller

```typescript
// controllers/transaction.controller.ts
export const scanReceiptController = asyncHandler(
  async (req: Request, res: Response) => {
    const file = req?.file;
    const result = await scanReceiptService(file);

    return res.status(HTTPSTATUS.OK).json({
      message: 'Receipt scanned successfully',
      data: result,
    });
  }
);
```

### Service Logic

```typescript
// services/transaction.service.ts
export const scanReceiptService = async (
  file: Express.Multer.File | undefined
) => {
  if (!file) throw new BadRequestException('No file uploaded');

  try {
    // 1. Check if file was uploaded
    if (!file.path) throw new BadRequestException('failed to upload file');

    // 2. Fetch image from Cloudinary and convert to base64
    const responseData = await axios.get(file.path, {
      responseType: 'arraybuffer',
    });
    const base64String = Buffer.from(responseData.data).toString('base64');

    if (!base64String) throw new BadRequestException('Could not process file');

    // 3. Send to Google Gemini AI
    const result = await genAI.models.generateContent({
      model: genAIModel,
      contents: [
        createUserContent([
          receiptPrompt,
          createPartFromBase64(base64String, file.mimetype),
        ]),
      ],
      config: {
        temperature: 0,  // Deterministic output
        topP: 1,
        responseMimeType: 'application/json',
      },
    });

    // 4. Parse and clean response
    const response = result.text;
    const cleanedText = response?.replace(/```(?:json)?\n?/g, '').trim();

    if (!cleanedText) {
      return { error: 'Could not read receipt content' };
    }

    // 5. Parse JSON
    const data = JSON.parse(cleanedText);

    // 6. Validate required fields
    if (!data.amount || !data.date) {
      return { error: 'Receipt missing required information' };
    }

    // 7. Return extracted data
    return {
      title: data.title || 'Receipt',
      amount: data.amount,
      date: data.date,
      description: data.description,
      category: data.category,
      paymentMethod: data.paymentMethod,
      type: data.type,
      receiptUrl: file.path,
    };
  } catch (error) {
    return { error: 'Receipt scanning service unavailable' };
  }
};
```

---

## Frontend Implementation

### Component

The receipt scanning is handled by the `ReceiptScanner` component:

```typescript
// components/transaction/reciept-scanner.tsx
export const ReceiptScanner = () => {
  const [uploadReceipt, { isLoading }] = useAiScanReceiptMutation();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const result = await uploadReceipt(formData).unwrap();
      // Handle successful scan
      setExtractedData(result.data);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <input
      type="file"
      accept="image/png, image/jpeg"
      onChange={handleFileChange}
    />
  );
};
```

### Integration in Transaction Form

```typescript
// components/transaction/add-transaction-drawer.tsx
export const AddTransactionDrawer = () => {
  const [extractedData, setExtractedData] = useState(null);

  return (
    <Drawer>
      <DrawerTrigger>Add Transaction</DrawerTrigger>
      <DrawerContent>
        <ReceiptScanner onScanSuccess={setExtractedData} />
        <TransactionForm defaultValues={extractedData} />
      </DrawerContent>
    </Drawer>
  );
};
```

---

## AI Processing

### Prompt Template

```typescript
// utils/prompt.ts
export const receiptPrompt = `
You are an expert at extracting transaction information from receipts.
Analyze the provided receipt image and extract the following details:

1. title - The name of the store or establishment (e.g., "Walmart", "Starbucks")
2. amount - The total amount spent (just the number, e.g., 125.50)
3. date - The transaction date (in YYYY-MM-DD format)
4. description - Any additional details or items purchased
5. category - The spending category (e.g., "groceries", "dining", "utilities")
6. paymentMethod - How the payment was made (CARD, CASH, BANK_TRANSFER, etc.)
7. type - Always "EXPENSE" for receipts

Return ONLY valid JSON in this exact format:
{
  "title": "string",
  "amount": number,
  "date": "YYYY-MM-DD",
  "description": "string",
  "category": "string",
  "paymentMethod": "CARD",
  "type": "EXPENSE"
}

If any field cannot be determined, use null for optional fields.
`;
```

### AI Configuration

```typescript
// config/google-ai.config.ts
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const genAIModel = 'gemini-2.0-flash';
```

| Setting | Value | Purpose |
|---------|-------|---------|
| Model | `gemini-2.0-flash` | Fast, cost-effective |
| Temperature | `0` | Deterministic output |
| TopP | `1` | Full probability distribution |
| Response MIME | `application/json` | Structured output |

---

## Supported Formats

### Input

| Format | MIME Type | Max Size |
|--------|-----------|----------|
| JPEG | `image/jpeg` | 2MB |
| PNG | `image/png` | 2MB |

### Output (AI Response)

```json
{
  "title": "Walmart Supercenter",
  "amount": 125.5,
  "date": "2025-01-15",
  "description": "Grocery items, household supplies",
  "category": "groceries",
  "paymentMethod": "CARD",
  "type": "EXPENSE"
}
```

---

## Response Handling

### Successful Response

```json
{
  "message": "Receipt scanned successfully",
  "data": {
    "title": "Walmart Supercenter",
    "amount": 125.5,
    "date": "2025-01-15",
    "description": "Grocery items",
    "category": "groceries",
    "paymentMethod": "CARD",
    "type": "EXPENSE",
    "receiptUrl": "https://res.cloudinary.com/..."
  }
}
```

### Partial Failure (Missing Data)

```json
{
  "message": "Receipt scanned successfully",
  "data": {
    "error": "Receipt missing required information"
  }
}
```

### Complete Failure

```json
{
  "message": "Receipt scanned successfully",
  "data": {
    "error": "Receipt scanning service unavailable"
  }
}
```

---

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|-------------|
| `No file uploaded` | No file in request | Check form data |
| `Failed to upload file` | Cloudinary error | Check Cloudinary config |
| `Could not process file` | Image conversion failed | Try different image |
| `Could not read receipt content` | AI couldn't process | Upload clearer image |
| `Receipt missing required information` | Incomplete data | User enters manually |
| `Receipt scanning service unavailable` | AI API down | Retry later |

---

## Cloudinary Integration

### Upload Configuration

```typescript
// config/cloudinary.config.ts
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'finailytics-receipts',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});
```

**Configuration:**
- Folder: `finailytics-receipts`
- Max dimensions: 1200x1200
- Auto-resize larger images

---

## Data Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         RECEIPT SCANNING FLOW                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌───────────┐  │
│  │  User   │────►│   Frontend   │────►│   Backend   │────►│Cloudinary │  │
│  │ Uploads │     │  FormData    │     │   Multer    │     │   Upload  │  │
│  │  Image  │     │              │     │             │     │           │  │
│  └─────────┘     └──────────────┘     └─────────────┘     └───────────┘  │
│                                                  │                        │
│                                                  ▼                        │
│                                          ┌─────────────┐                  │
│                                          │  Convert    │                  │
│                                          │  to Base64  │                  │
│                                          └─────────────┘                  │
│                                                  │                        │
│                                                  ▼                        │
│                                          ┌─────────────┐                  │
│                                          │   Google    │                  │
│                                          │   Gemini    │                  │
│                                          │     AI      │                  │
│                                          └─────────────┘                  │
│                                                  │                        │
│                                                  ▼                        │
│                                          ┌─────────────┐                  │
│                                          │    Parse    │                  │
│                                          │    JSON     │                  │
│                                          └─────────────┘                  │
│                                                  │                        │
│                                                  ▼                        │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────┐                   │
│  │  User   │◄────│   Frontend   │◄────│   Backend   │                   │
│  │ Reviews │     │   Display    │     │   Response  │                   │
│  │  Data   │     │  Extracted   │     │   (JSON)    │                   │
│  └─────────┘     └──────────────┘     └─────────────┘                   │
│                                                  │                        │
│                                                  ▼                        │
│                                          ┌─────────────┐                  │
│                                          │   Create    │                  │
│                                          │Transaction  │                  │
│                                          │ (Optional)  │                  │
│                                          └─────────────┘                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

```env
# Backend
GEMINI_API_KEY=your_google_gemini_api_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## Notes

- The AI is configured with `temperature: 0` for consistent, deterministic results
- Receipt URL is stored for future reference
- The user can edit any field before saving
- Both JPEG and PNG formats are supported
- File size is limited to 2MB to optimize processing
- All transaction fields are optional except amount and date