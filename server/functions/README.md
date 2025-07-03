# Firebase Cloud Function - Chat with GPT-4

This Firebase Cloud Function converts your Express `/chat` endpoint into a serverless function.

## Setup Instructions

### 1. Initialize Firebase (Run this yourself)
```bash
npx firebase init functions
```
- Select "Use an existing project"
- Choose "lod-crm-systems"
- Select TypeScript
- Use ESLint: No
- Install dependencies: Yes

### 2. Install Dependencies
```bash
cd functions
npm install
```

### 3. Set OpenAI API Key
```bash
firebase functions:config:set openai.api_key="your_openai_api_key_here"
```

### 4. Build the Function
```bash
npm run build
```

### 5. Deploy
```bash
firebase deploy --only functions
```

## Function Details

### Endpoint
- **URL**: `https://us-central1-lod-crm-systems.cloudfunctions.net/chat`
- **Method**: POST
- **Content-Type**: application/json

### Request Body
```json
{
  "message": "Your message here"
}
```

### Response
```json
{
  "reply": "GPT-4 response here"
}
```

### Features
- ✅ Accepts JSON input with `message` field
- ✅ Uses OpenAI GPT-4 API
- ✅ Saves conversations to Firestore `conversations` collection
- ✅ Includes timestamp, model, and token usage
- ✅ CORS enabled for frontend requests
- ✅ Comprehensive error handling
- ✅ Serverless deployment

### Firestore Data Structure
```javascript
{
  message: "User's message",
  reply: "GPT-4's response",
  timestamp: serverTimestamp(),
  model: "gpt-4",
  tokens_used: 123
}
```

## Local Testing
```bash
npm run serve
```

## View Logs
```bash
firebase functions:log
``` 