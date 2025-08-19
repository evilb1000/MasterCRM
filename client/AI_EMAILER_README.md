# AI Emailer Integration

## Overview
The AI Emailer allows users to compose and send emails using natural language commands through the chat interface. Users can type commands like "EMAIL JIM MARTIN ABOUT PROPERTY SHOWING" and the AI will handle the email composition and sending process.

## Features

### 🎯 **Email Command Detection**
- Automatically detects email-related commands in user messages
- Supports various email patterns and phrasings
- Integrates seamlessly with existing AI command system

### 📧 **Supported Email Commands**
- **Direct commands**: "EMAIL JIM MARTIN ABOUT X"
- **Send patterns**: "send email to john@example.com regarding contract"
- **Write patterns**: "write email for sarah about meeting"
- **Compose patterns**: "compose email to client concerning offer"
- **Contact patterns**: "contact jim via email about follow up"
- **Reach out patterns**: "reach out to sarah via email about property"
- **Follow up patterns**: "follow up with mike via email about showing"

### 🤖 **AI-Powered Intent Analysis**
- Uses OpenAI GPT-4 to analyze user intent
- Extracts recipient, subject, body, and other email details
- Handles ambiguous requests with contextual understanding

### 🔄 **Integration Points**
- **Client-side**: `src/services/aiEmailer.js`
- **Server-side**: `/ai-email` endpoint in `server/server.js`
- **ChatBox**: Integrated into existing AI command processing
- **Firebase**: Contact lookup and email logging (future implementation)

## Architecture

### Client-Side Service (`aiEmailer.js`)
```javascript
// Main functions
handleAIEmail(message)           // Sends request to AI endpoint
isEmailCommand(message)          // Detects email commands
processEmailCommand(message)     // Processes and executes email commands
```

### Server-Side Endpoint (`/ai-email`)
```javascript
// Intent analysis with GPT-4
// Email composition handling
// Gmail API integration (future)
// Firebase contact lookup (future)
```

### Command Processing Flow
1. **User types**: "EMAIL JIM MARTIN ABOUT PROPERTY SHOWING"
2. **ChatBox detects**: `isEmailCommand()` returns `true`
3. **Routes to**: `processEmailCommand()`
4. **Server analyzes**: GPT-4 determines intent and extracts data
5. **Email composed**: AI generates email content
6. **Email sent**: Via Gmail API (future implementation)
7. **Activity logged**: In CRM system (future implementation)

## Usage Examples

### Basic Email Commands
```
"EMAIL JIM MARTIN ABOUT PROPERTY SHOWING"
"send email to john@example.com regarding contract"
"write email for sarah about meeting tomorrow"
"compose email to client concerning offer details"
```

### Advanced Email Commands
```
"contact jim via email about follow up on listing"
"reach out to sarah via email about property viewing"
"follow up with mike via email about showing feedback"
"email client from jim about contract updates"
```

## Configuration

### Endpoints
```javascript
// config.js
AI_EMAIL: 'https://aicontactaction-obagwr34kq-uc.a.run.app'
```

### Environment Variables
```bash
# Server .env file
OPENAI_API_KEY=your_openai_api_key_here
```

## Future Enhancements

### Phase 2: Full Email Functionality
- **Contact Lookup**: Find recipients in Firebase contacts
- **Content Generation**: AI-powered email body composition
- **Gmail Integration**: Send emails via Gmail API
- **Activity Logging**: Record email activities in CRM
- **Template System**: Pre-built email templates
- **Attachment Support**: Handle file attachments

### Phase 3: Advanced Features
- **Email Scheduling**: Send emails at specific times
- **Follow-up Automation**: Automatic follow-up reminders
- **Email Analytics**: Track open rates and responses
- **Smart Suggestions**: AI-powered email content suggestions

## Testing

### Test File
- `src/examples/test-ai-emailer.js` - Test email command detection
- Run in browser console to verify functionality

### Manual Testing
1. Start the development server
2. Open the chat interface
3. Type email commands like "EMAIL JIM MARTIN ABOUT X"
4. Verify AI response and routing

## Error Handling

### Client-Side Errors
- Network connectivity issues
- Invalid server responses
- Missing or malformed data

### Server-Side Errors
- OpenAI API key issues
- Rate limiting
- Intent analysis failures
- Email composition errors

## Dependencies

### Client
- `axios` - HTTP requests
- `../config.js` - Endpoint configuration

### Server
- `openai` - OpenAI API client
- `firebase-admin` - Firebase integration (future)
- `gmail-api` - Gmail API integration (future)

## Security Considerations

### API Key Management
- OpenAI API key stored in environment variables
- No client-side exposure of sensitive keys
- Secure server-side processing

### Data Privacy
- Email content processed securely on server
- No sensitive data logged unnecessarily
- User consent for email operations

## Troubleshooting

### Common Issues
1. **"OpenAI API key not configured"**
   - Check server `.env` file
   - Verify `OPENAI_API_KEY` is set

2. **"Unable to connect to AI Email server"**
   - Check server is running
   - Verify endpoint URL in config

3. **"Low confidence in email intent analysis"**
   - Rephrase email command
   - Be more specific about recipient and topic

4. **Email commands not detected**
   - Check `isEmailCommand()` patterns
   - Verify command syntax

### Debug Logging
- Client-side: Console logs for command detection
- Server-side: Detailed logging for intent analysis
- OpenAI: Response logging for debugging

## Contributing

### Adding New Email Patterns
1. Update `isEmailCommand()` in `aiEmailer.js`
2. Add new regex patterns or keywords
3. Test with various command formats
4. Update documentation

### Extending Email Functionality
1. Modify server-side intent analysis
2. Add new email handling functions
3. Integrate with additional services
4. Update client-side processing

## Support

For issues or questions about the AI Emailer:
1. Check server logs for error details
2. Verify OpenAI API key configuration
3. Test with simple email commands
4. Review intent analysis responses
