# Martin Rebuild Backend

A Node.js Express backend with OpenAI GPT-4 integration for chat functionality.

## Features

- Express server running on port 3001
- OpenAI GPT-4 integration
- CORS support for cross-origin requests
- Comprehensive error handling
- Environment variable configuration
- Health check endpoint

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy your OpenAI API key to the `.env` file:
   ```bash
   OPENAI_API_KEY=your_actual_openai_api_key_here
   PORT=3001
   ```

3. **Start the server:**
   ```bash
   # Production
   npm start
   
   # Development (with auto-restart)
   npm run dev
   ```

## API Endpoints

### Health Check
- **GET** `/`
- Returns server status

### Chat Endpoint
- **POST** `/chat`
- Sends a message to GPT-4 and returns the response

#### Request Body:
```json
{
  "message": "Say something smart"
}
```

#### Response:
```json
{
  "reply": "GPT-4's response here..."
}
```

#### Error Responses:
- `400` - Invalid input (missing or invalid message)
- `401` - Invalid OpenAI API key
- `429` - Rate limit exceeded
- `500` - Server error

## Testing the API

You can test the chat endpoint using curl:

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

Or using a tool like Postman/Insomnia with:
- URL: `http://localhost:3001/chat`
- Method: `POST`
- Headers: `Content-Type: application/json`
- Body: `{"message": "Your message here"}`

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)

## Dependencies

- `express` - Web framework
- `openai` - OpenAI API client
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `nodemon` - Development auto-restart (dev dependency) 