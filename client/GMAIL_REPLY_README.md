# Gmail Reply Functionality

## Overview
This document describes the Gmail reply functionality that has been added to the web application, allowing users to reply to emails directly from the EmailsModal.

## Features Added

### 1. Reply Button
- A "Reply" button appears beneath each selected email in the EmailsModal
- Clicking the button reveals a reply form with a textarea and action buttons

### 2. Reply Form
- **Textarea**: Multi-line input field for composing the reply message
- **Send Button**: Sends the reply using the Gmail API
- **Cancel Button**: Cancels the reply and returns to view mode
- **Loading States**: Visual feedback during sending process

### 3. Delete Functionality
- **Delete Button**: Red delete button next to the reply button
- **Confirmation**: Built-in confirmation through the delete process
- **API Integration**: Uses Gmail API DELETE endpoint
- **List Update**: Automatically removes deleted emails from the list
- **Feedback**: Success/error messages with automatic cleanup

### 4. Gmail API Integration
- Uses the existing `gmailAccessToken` from AuthContext
- Sends replies with proper email headers:
  - `To`: Recipient (original sender)
  - `Subject`: Prefixed with "Re:" if not already present
  - `In-Reply-To`: References the original message
  - `References`: Links to the conversation thread
  - `threadId`: Maintains conversation threading
- Deletes messages using Gmail API DELETE endpoint

## Technical Implementation

### Files Modified
1. **`src/contexts/AuthContext.jsx`**
   - Added `gmail.send` scope to Google OAuth provider
   - Users will need to re-authenticate to grant send permissions

2. **`src/components/EmailsModal.jsx`**
   - Added reply state management
   - Integrated reply form UI
   - Added reply handling functions

3. **`src/services/gmailService.js`** (New)
   - `sendReply()`: Main function for sending replies
   - `extractEmailAddress()`: Parses email addresses from display names
   - `getThread()`: Fetches conversation threads (for future use)
   - `deleteMessage()`: Deletes email messages

### State Management
The reply functionality uses local state within the EmailsModal:
```javascript
const [replyState, setReplyState] = useState({
  isReplying: false,    // Whether reply form is visible
  replyText: '',        // Current reply text
  sending: false,       // Sending in progress
  error: '',           // Error message if any
  success: ''          // Success message if any
});
```

### API Endpoints Used
- **Send Reply**: `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
- **Get Thread**: `GET https://gmail.googleapis.com/gmail/v1/users/me/threads/{threadId}`
- **Delete Message**: `DELETE https://gmail.googleapis.com/gmail/v1/users/me/messages/{messageId}`

## User Experience

### Workflow
1. User clicks "Emails" button to open the modal
2. User selects an email from the list
3. User clicks "Reply" button beneath the email content
4. Reply form appears with textarea and action buttons
5. User types their reply message
6. User clicks "Send" to submit the reply
7. Success/error feedback is displayed
8. Form automatically closes on successful send

### Delete Workflow
1. User selects an email from the list
2. User clicks "Delete" button next to the reply button
3. Delete process starts immediately (no additional confirmation needed)
4. Email is deleted from Gmail via API
5. Success message is displayed
6. Detail view closes automatically
7. Email is removed from the emails list

### Error Handling
- **Missing Access Token**: Prompts user to re-authenticate
- **Empty Reply**: Prevents sending empty messages
- **API Errors**: Displays specific error messages from Gmail API
- **Network Issues**: Graceful fallback with user-friendly messages
- **Delete Failures**: Shows specific error messages for failed deletions

### Success Feedback
- Success message displayed for 3 seconds
- Form automatically closes
- Reply is sent to the original sender
- Message appears in the Gmail thread

### Delete Feedback
- Success message displayed for 1.5 seconds
- Detail view automatically closes
- Email is removed from the emails list
- Email is permanently deleted from Gmail

## Security Considerations

### OAuth Scopes
- **Read**: `https://www.googleapis.com/auth/gmail.readonly`
- **Send**: `https://www.googleapis.com/auth/gmail.send`

### Token Management
- Uses existing `gmailAccessToken` from AuthContext
- No additional token storage required
- Tokens are automatically refreshed by Google OAuth

## Testing

### Manual Testing
1. Sign in with Google account
2. Grant Gmail permissions (read + send)
3. Open EmailsModal and select an email
4. Test reply functionality with various message lengths
5. Verify emails are received by the original sender

### Test File
- `src/examples/test-gmail-reply.js` contains unit tests for the service
- Can be run in browser console for validation

## Future Enhancements

### Potential Features
1. **Rich Text Editor**: Support for formatted replies
2. **Attachments**: Include files in replies
3. **Draft Saving**: Auto-save drafts while composing
4. **Signature**: Automatic email signature insertion
5. **Thread View**: Show full conversation history
6. **Reply All**: Support for replying to multiple recipients

### Technical Improvements
1. **Rate Limiting**: Implement Gmail API quota management
2. **Caching**: Cache thread data for better performance
3. **Offline Support**: Queue replies when offline
4. **Analytics**: Track reply usage and success rates

## Troubleshooting

### Common Issues
1. **"Missing Gmail access"**: User needs to re-authenticate
2. **"Failed to send reply"**: Check network connection and API quotas
3. **Permission denied**: Verify OAuth scopes are properly granted

### Debug Steps
1. Check browser console for error messages
2. Verify `gmailAccessToken` exists in AuthContext
3. Confirm Gmail API quotas haven't been exceeded
4. Test with a simple reply message first

## Dependencies
- No new npm packages required
- Uses existing Firebase authentication
- Leverages Gmail REST API v1
- Compatible with current React 19 setup
