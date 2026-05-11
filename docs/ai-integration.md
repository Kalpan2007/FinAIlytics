# AI Integration Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Google Gemini Integration](#google-gemini-integration)
4. [Receipt Scanning AI](#receipt-scanning-ai)
5. [AI Configuration](#ai-configuration)
6. [Prompt Engineering](#prompt-engineering)
7. [Error Handling](#error-handling)
8. [Cost Optimization](#cost-optimization)
9. [Future Enhancements](#future-enhancements)

---

## Overview

FinAIlytics leverages **Google Gemini AI** for intelligent receipt parsing and transaction extraction. The AI transforms uploaded receipt images into structured transaction data, eliminating manual data entry.

---

## Technology Stack

| Service | Purpose | Version |
|---------|---------|---------|
| Google Gemini 2.0 Flash | AI Model | Latest |
| @google/generativeai | Node.js SDK | Latest |
| Cloudinary | Image hosting | SDK |

---

## Google Gemini Integration

### Configuration

```typescript
// config/google-ai.config.ts
import { GoogleGenerativeAI } from '@google/generativeai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
export const genAIModel = 'gemini-2.0-flash';
```

### Initialization Check

```typescript
// Verify API key is loaded
console.log('Gemini API Key loaded:', GEMINI_API_KEY ? 'Yes' : 'No');
```

---

## Receipt Scanning AI

### Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI Processing Pipeline                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Image Upload                                                        │
│     ├── User uploads receipt (JPEG/PNG)                                │
│     ├── Cloudinary stores image                                         │
│     └── Returns image URL                                              │
│                              │                                          │
│                              ▼                                          │
│  2. Image Conversion                                                    │
│     ├── Fetch image from Cloudinary URL                                │
│     ├── Convert to base64 string                                        │
│     └── Ensure correct MIME type                                       │
│                              │                                          │
│                              ▼                                          │
│  3. AI Request                                                          │
│     ├── Create content with prompt + image                             │
│     ├── Configure settings (temperature, response format)             │
│     └── Send to Gemini 2.0 Flash                                       │
│                              │                                          │
│                              ▼                                          │
│  4. Response Processing                                                │
│     ├── Parse text response                                             │
│     ├── Remove markdown formatting                                      │
│     ├── Validate JSON structure                                        │
│     └── Extract transaction fields                                     │
│                              │                                          │
│                              ▼                                          │
│  5. Data Validation                                                     │
│     ├── Check required fields (amount, date)                           │
│     ├── Apply defaults for optional fields                             │
│     └── Return extracted data                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Code Implementation

```typescript
// services/transaction.service.ts - scanReceiptService

export const scanReceiptService = async (
  file: Express.Multer.File | undefined
) => {
  if (!file) throw new BadRequestException('No file uploaded');

  try {
    // Step 1: Validate file
    if (!file.path) throw new BadRequestException('failed to upload file');

    // Step 2: Convert image to base64
    const responseData = await axios.get(file.path, {
      responseType: 'arraybuffer',
    });
    const base64String = Buffer.from(responseData.data).toString('base64');

    if (!base64String) throw new BadRequestException('Could not process file');

    // Step 3: Send to Gemini AI
    const result = await genAI.models.generateContent({
      model: genAIModel,
      contents: [
        createUserContent([
          receiptPrompt,
          createPartFromBase64(base64String, file.mimetype),
        ]),
      ],
      config: {
        temperature: 0,
        topP: 1,
        responseMimeType: 'application/json',
      },
    });

    // Step 4: Parse response
    const response = result.text;
    const cleanedText = response?.replace(/```(?:json)?\n?/g, '').trim();

    if (!cleanedText) {
      return { error: 'Could not read receipt content' };
    }

    const data = JSON.parse(cleanedText);

    // Step 5: Validate required fields
    if (!data.amount || !data.date) {
      return { error: 'Receipt missing required information' };
    }

    // Return extracted data
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

## AI Configuration

### Model Settings

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Model | `gemini-2.0-flash` | Fast, cost-effective for receipt scanning |
| Temperature | `0` | Deterministic, consistent output |
| TopP | `1` | Full probability distribution for best results |
| Response MIME | `application/json` | Structured, parseable output |

### Why Gemini 2.0 Flash?

1. **Speed:** Optimized for fast responses
2. **Cost-effective:** Lower token costs
3. **Vision capability:** Excellent at reading receipts
4. **JSON output:** Native support for structured responses

---

## Prompt Engineering

### Receipt Extraction Prompt

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

### Prompt Design Principles

1. **Clear instructions:** Specify exact output format
2. **Field definitions:** Explain each field clearly
3. **Examples:** (Not shown but can be added) Show expected outputs
4. **Error handling:** Specify null for missing fields
5. **Strict format:** JSON only, no additional text

---

## Error Handling

### Error Types

| Error | Cause | Response |
|-------|-------|----------|
| `No file uploaded` | Multer didn't process file | Throw BadRequestException |
| `failed to upload file` | Cloudinary error | Throw BadRequestException |
| `Could not process file` | Base64 conversion failed | Return error object |
| `Could not read receipt content` | AI returned empty | Return error object |
| `Receipt missing required information` | AI missing amount/date | Return error object |
| `Receipt scanning service unavailable` | API error/failure | Return error object |

### Graceful Degradation

```typescript
// Return error object instead of throwing
if (!data.amount || !data.date) {
  return { error: 'Receipt missing required information' };
}

// Catch all errors
} catch (error) {
  return { error: 'Receipt scanning service unavailable' };
}
```

---

## Cost Optimization

### Strategies

1. **Model Selection:** Use `gemini-2.0-flash` (cheapest option)
2. **Image Sizing:** Cloudinary limits to 1200x1200
3. **Temperature 0:** Faster processing, predictable output
4. **Response Validation:** Early exit on invalid input
5. **Request Batching:** Not applicable for single receipt

### Token Usage Estimation

| Input | Approximate Tokens |
|-------|-------------------|
| Receipt image (1200x1200) | ~50K tokens |
| Prompt text | ~500 tokens |
| **Total per request** | ~50.5K tokens |

*Note: Actual usage varies based on image content.*

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI Integration Architecture                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│  │   Frontend   │───►│    Backend   │───►│  Cloudinary  │                 │
│  │  (Upload)    │    │   (Multer)   │    │   (Storage)  │                 │
│  └──────────────┘    └──────────────┘    └──────────────┘                 │
│                             │                                                │
│                             ▼                                                │
│                      ┌──────────────┐                                      │
│                      │   Convert    │                                      │
│                      │   to Base64  │                                      │
│                      └──────────────┘                                      │
│                             │                                                │
│                             ▼                                                │
│                      ┌──────────────┐                                      │
│                      │    Gemini    │                                      │
│                      │     AI       │                                      │
│                      │  2.0 Flash   │                                      │
│                      └──────────────┘                                      │
│                             │                                                │
│                             ▼                                                │
│                      ┌──────────────┐                                      │
│                      │    Parse     │                                      │
│                      │    JSON      │                                      │
│                      └──────────────┘                                      │
│                             │                                                │
│                             ▼                                                │
│  ┌──────────────┐    ┌──────────────┐                                      │
│  │   Frontend   │◄───│    Backend   │                                      │
│  │   (Display)  │    │   (Response) │                                      │
│  └──────────────┘    └──────────────┘                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

### Required Variables

```env
# Google AI
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### Getting API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy to `.env` file
4. (Optional) Set up billing for higher limits

---

## Testing

### Test Cases

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Clear receipt | Walmart receipt with total $125.50 | All fields extracted |
| Partial data | Receipt without date | Error: "missing required information" |
| Blurry image | Unreadable receipt | Error: "Could not read receipt content" |
| Non-receipt | Random photo | Error: "Could not read receipt content" |

---

## Future Enhancements

### Potential Features

1. **Category Suggestions:** AI recommends categories based on store name
2. **Multi-item Extraction:** Parse individual line items from receipts
3. **Duplicate Detection:** Check if similar transaction already exists
4. **Receipt Storage:** Full image archival with search
5. **OCR Language Support:** Handle receipts in multiple languages

### Alternative Models

- **Gemini Pro:** Better accuracy, higher cost
- **Vision Model:** Specialized for image understanding
- **Custom Model:** Fine-tuned for receipt parsing (future)

---

## Monitoring

### Logging

```typescript
// Add logging for debugging
console.log('Processing receipt:', file.path);
console.log('AI Response:', result.text);
```

### Metrics to Track

- API response time
- Success/failure rate
- Token usage per request
- Error types distribution

---

## Notes

- All images are stored in Cloudinary before AI processing
- The AI is configured for deterministic output (temperature: 0)
- JSON response is validated before returning to frontend
- Graceful error handling ensures user always gets feedback
- Configuration is environment-based for easy key management