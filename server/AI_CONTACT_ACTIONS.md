# AI Contact Actions - Backend Integration

## Overview

The `/ai-contact-action` endpoint uses a sophisticated two-step AI approach to handle natural language commands for your CRM system:

1. **Intent Analysis**: GPT-4 analyzes what the user wants to do
2. **Action Execution**: The system executes the appropriate action based on the intent

This approach provides better understanding, more robust error handling, and support for general CRM questions.

## Features

- **Intelligent Intent Recognition**: AI understands what you want to do before executing
- **Natural Language Processing**: Send commands like "update John Smith's phone number to 555-1234"
- **Smart Contact Identification**: Finds contacts by email, name, or company
- **General Query Support**: Can answer questions about how to use the CRM
- **Secure Server-Side Processing**: All Firestore operations happen on the backend
- **Action Logging**: All AI actions are logged to Firestore for audit trails
- **Comprehensive Error Handling**: Helpful error messages with suggestions

## How It Works

### Step 1: Intent Analysis
The AI analyzes your request and categorizes it into one of these intents:

- **UPDATE_CONTACT**: Update existing contact information
- **CREATE_CONTACT**: Create a new contact (future feature)
- **DELETE_CONTACT**: Delete a contact or contact field
- **SEARCH_CONTACT**: Search for contacts (future feature)
- **LIST_CONTACTS**: List all contacts (future feature)
- **GENERAL_QUERY**: General questions about the CRM system

### Step 2: Action Execution
Based on the intent, the system executes the appropriate action using dedicated handler functions.

## Endpoint Details

### POST `/ai-contact-action`

**Request Body:**
```json
{
  "command": "update John Smith's phone number to 555-1234"
}
```

**Response Examples:**

**Successful Update:**
```json
{
  "success": true,
  "message": "Updated phone for John Smith",
  "action": "update",
  "contactId": "contact_document_id",
  "field": "phone",
  "value": "555-1234"
}
```

**General Query Response:**
```json
{
  "success": true,
  "message": "Here's how to use the CRM system...",
  "action": "general_query",
  "isChatResponse": true
}
```

**Error Response:**
```json
{
  "error": "I'm not sure what you want to do. Please be more specific.",
  "details": "Low confidence in intent analysis",
  "suggestion": "Could you please specify what you want to do with the contacts?"
}
```

## Supported Commands

### Update Operations
- `"update John Smith's phone number to 555-1234"`
- `"change Jane Doe's email to jane.doe@example.com"`
- `"set John's company to Acme Corp"`
- `"update the address for John Smith to 123 Main St"`

### Delete Operations
- `"delete John Smith's phone number"`
- `"remove contact John Smith"`
- `"delete the entire contact for Jane Doe"`

### General Queries
- `"how do I use this CRM system?"`
- `"what can I do with contacts?"`
- `"how do I add a new contact?"`

## Contact Identification

The AI can identify contacts using:

1. **Email Address**: `"update john@example.com's phone to 555-1234"`
2. **Full Name**: `"update John Smith's email to john@example.com"`
3. **Company Name**: `"update Acme Corp's phone to 555-1234"`

## Available Fields

- `firstName`
- `lastName`
- `email`
- `phone`
- `company`
- `address`
- `businessSector`
- `linkedin`
- `notes`

## Frontend Integration

### Basic Usage

```javascript
async function handleAIContactAction(command) {
  try {
    const response = await fetch('http://localhost:3001/ai-contact-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to process command');
    }
    
    return result;
  } catch (error) {
    console.error('Error processing AI command:', error);
    throw error;
  }
}

// Example usage
const result = await handleAIContactAction("update John Smith's phone to 555-1234");
console.log(result.message); // "Updated phone for John Smith"
```

### React Component Integration

```jsx
import { useState } from 'react';

function ChatBoxWithAIActions() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      const result = await handleAIContactAction(userMessage);
      
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: result.success ? `✅ ${result.message}` : `❌ ${result.error}`,
        action: result
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="message assistant">Processing...</div>}
      </div>
      
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message or contact command..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

## Error Handling

The endpoint returns appropriate HTTP status codes and error messages:

- `400` - Invalid input or low confidence in intent analysis
- `404` - Contact not found
- `401` - Invalid OpenAI API key
- `429` - Rate limit exceeded
- `500` - Server error

### Error Response Structure
```json
{
  "error": "User-friendly error message",
  "details": "Technical details for debugging",
  "suggestion": "Helpful suggestion for the user"
}
```

## Security Features

- **Server-Side Processing**: All Firestore operations happen on the backend
- **No Credential Exposure**: Firebase admin credentials stay on the server
- **Input Validation**: All commands are validated before processing
- **Action Logging**: All actions are logged for audit purposes
- **Intent Validation**: Low-confidence intents are rejected with helpful suggestions

## Firestore Collections

### `contacts` Collection
Your existing contacts collection with fields:
- `firstName`, `lastName`, `email`, `phone`, `company`, `address`, `businessSector`, `linkedin`, `notes`

### `ai_actions` Collection (New)
Logs all AI contact actions:
```json
{
  "command": "update John Smith's phone to 555-1234",
  "action": "update",
  "contactId": "contact_doc_id",
  "contactName": "John Smith",
  "field": "phone",
  "value": "555-1234",
  "timestamp": "2024-01-15T10:30:00Z",
  "success": true
}
```

## Testing Examples

### Valid Commands
```bash
# Update phone
curl -X POST http://localhost:3001/ai-contact-action \
  -H "Content-Type: application/json" \
  -d '{"command": "update John Smith phone to 555-1234"}'

# Update email
curl -X POST http://localhost:3001/ai-contact-action \
  -H "Content-Type: application/json" \
  -d '{"command": "change Jane Doe email to jane@example.com"}'

# General query
curl -X POST http://localhost:3001/ai-contact-action \
  -H "Content-Type: application/json" \
  -d '{"command": "how do I use this CRM system?"}'

# Delete field
curl -X POST http://localhost:3001/ai-contact-action \
  -H "Content-Type: application/json" \
  -d '{"command": "delete John Smith phone number"}'
```

## Environment Variables

Make sure your `.env` file contains:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Dependencies

The endpoint uses these existing dependencies:
- `express` - Web framework
- `openai` - OpenAI API client
- `firebase-admin` - Firebase Admin SDK
- `cors` - CORS middleware

## Troubleshooting

### Common Issues

1. **"I'm not sure what you want to do"**
   - Be more specific about the contact and action
   - Use clear field names (phone, email, company, etc.)
   - Include the contact's full name or email

2. **"Contact not found"**
   - Ensure the contact exists in your Firestore `contacts` collection
   - Check spelling of names, emails, or company names
   - Verify the contact identifier format

3. **"Invalid OpenAI API key"**
   - Check your `.env` file has the correct `OPENAI_API_KEY`
   - Verify the API key is valid and has sufficient credits

4. **"Rate limit exceeded"**
   - Wait a moment before sending another command
   - Check your OpenAI account usage

### Debug Mode

Set `NODE_ENV=development` in your `.env` file to get detailed error messages in responses.

## Performance Considerations

- The endpoint makes two GPT-4 calls (intent analysis + general query if needed)
- Total processing time is typically 2-4 seconds
- Consider implementing caching for frequently accessed contacts
- Monitor OpenAI API usage and costs
- The endpoint logs all actions to Firestore for audit trails

## Future Enhancements

The modular design makes it easy to add new features:

- **Contact Creation**: `"create a new contact for John Doe"`
- **Contact Search**: `"find all contacts from Acme Corp"`
- **Contact Listing**: `"show me all contacts"`
- **Bulk Operations**: `"update all contacts from Acme Corp"`
- **Advanced Queries**: `"find contacts who haven't been contacted in 30 days"`
- **Voice Commands**: Integration with speech-to-text
- **Smart Suggestions**: AI suggests actions based on user patterns

## Architecture Benefits

The two-step approach provides several advantages:

1. **Better Understanding**: AI first understands intent before acting
2. **Extensible**: Easy to add new action types
3. **Robust**: Handles edge cases and unclear requests gracefully
4. **User-Friendly**: Provides helpful suggestions when commands are unclear
5. **Maintainable**: Each action type has its own handler function
6. **Future-Proof**: Structure supports complex operations 