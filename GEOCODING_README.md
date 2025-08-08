# Contact Address Geocoding Script

This script will geocode all contact addresses in your Firestore database and add latitude/longitude coordinates to each contact document.

## Prerequisites

1. **Google API Key**: You need a Google Maps API key with Geocoding API enabled
2. **Firebase Service Account**: The script uses the existing service account key in `server/secrets/serviceAccountKey.json`

## Setup

1. **Get your Google API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Geocoding API
   - Create an API key
   - Set the environment variable:
   ```bash
   export GOOGLE_API_KEY="your_google_api_key_here"
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install firebase-admin node-fetch
   ```

## Running the Script

```bash
node geocode-contacts.js
```

## What the Script Does

1. **Fetches all contacts** from your Firestore database
2. **Skips contacts** that already have latitude/longitude coordinates
3. **Skips contacts** without addresses
4. **Geocodes each address** using Google's Geocoding API
5. **Updates each contact** with:
   - `latitude`: The latitude coordinate
   - `longitude`: The longitude coordinate  
   - `geocodedAt`: Timestamp of when geocoding was performed
6. **Respects API rate limits** with 200ms delays between requests
7. **Provides detailed logging** and progress updates

## Output

The script will show:
- Progress updates every 10 contacts
- Success/failure for each geocoding attempt
- Final summary with counts of processed, geocoded, failed, and skipped contacts

## Example Output

```
🚀 Starting contact geocoding process...
📊 Found 25 contacts to process

👤 Processing contact: John Smith (abc123)
🗺️ Geocoding address: 123 Main St, Pittsburgh, PA 15201
✅ Geocoded successfully: 40.4406, -79.9959
✅ Updated contact with coordinates: 40.4406, -79.9959

👤 Processing contact: Jane Doe (def456)
⏭️ Skipping - already has coordinates: 40.4406, -79.9959

📈 Progress: 10/25 processed

🎉 Geocoding process complete!
📊 Summary:
   Total contacts: 25
   Processed: 25
   Successfully geocoded: 20
   Failed: 3
   Skipped (already geocoded): 2
```

## Error Handling

- **Invalid addresses**: Will be logged as failed but won't stop the script
- **API errors**: Will be logged and the contact will be marked as failed
- **Network issues**: Will retry automatically
- **Rate limiting**: Built-in delays to respect Google API limits

## Cost Considerations

- Google Geocoding API costs approximately $5 per 1,000 requests
- The script processes one address per request
- 100 contacts = ~$0.50
- 1,000 contacts = ~$5.00

## Safety Features

- **Idempotent**: Can be run multiple times safely
- **Non-destructive**: Only adds new fields, doesn't modify existing data
- **Progress tracking**: Shows exactly what's happening
- **Error recovery**: Continues processing even if some addresses fail 