# Migration Guide: Removing functions.config() Usage

## Overview
This guide documents the migration from the deprecated `functions.config()` to environment variables and Secret Manager for Firebase Functions.

## Changes Made

### 1. Updated `src/index.ts`
- **Before**: Used `functions.config().openai?.api_key`
- **After**: Uses `process.env.OPENAI_API_KEY` only
- **Files Modified**: `server/functions/src/index.ts`

### 2. Updated `server.js`
- **Before**: Had fallback logic for `functions.config().openai?.api_key`
- **After**: Uses `process.env.OPENAI_API_KEY` only
- **Files Modified**: `server/server.js`

### 3. Updated Documentation
- **Before**: Instructions for `firebase functions:config:set`
- **After**: Instructions for environment variables and Secret Manager
- **Files Modified**: `server/functions/README.md`

## Configuration Options

### Option 1: Environment Variables (Recommended)
Create a `.env` file in the functions directory:
```bash
cd server/functions
echo "OPENAI_API_KEY=your_actual_api_key_here" > .env
```

### Option 2: Firebase Secret Manager
```bash
firebase functions:secrets:set OPENAI_API_KEY
# Enter your API key when prompted
```

## Deployment Steps

1. **Set your API key** using one of the methods above

2. **Build the functions**:
   ```bash
   cd server/functions
   npm run build
   ```

3. **Deploy**:
   ```bash
   firebase deploy --only functions
   ```

## Verification

After deployment, test your function to ensure it's working:
```bash
curl -X POST https://us-central1-lod-crm-systems.cloudfunctions.net/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, world!"}'
```

## Troubleshooting

If you encounter issues:

1. **Check environment variables**: Ensure `OPENAI_API_KEY` is properly set
2. **Check logs**: `firebase functions:log`
3. **Verify deployment**: Check the Firebase Console for function status

## Benefits of This Migration

- ✅ Removes dependency on deprecated Cloud Runtime Config
- ✅ Better security with Secret Manager option
- ✅ Simpler configuration with environment variables
- ✅ Future-proof approach
- ✅ Improved deployment reliability 