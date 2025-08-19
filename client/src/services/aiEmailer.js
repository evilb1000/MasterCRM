import axios from 'axios';
import { ENDPOINTS } from '../config.js';

/**
 * Handle AI Email Composition and Sending
 * Sends user messages to the AI email endpoint for intelligent email creation and sending
 * 
 * @param {string} message - User's natural language command (e.g., "EMAIL JIM MARTIN ABOUT X")
 * @returns {Promise<Object>} Response from the AI endpoint
 */
export async function handleAIEmail(message) {
  const endpoint = ENDPOINTS.AI_EMAIL;
  
  try {
    const response = await axios.post(endpoint, { 
      command: message 
    });
    
    return response.data;
  } catch (error) {
    console.error('AI Email Error:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data;
      if (errorData && errorData.error) {
        throw new Error(errorData.error);
      } else if (errorData && errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      // Network error - server not running
      throw new Error('Unable to connect to AI Email server. Please check your connection and try again.');
    } else {
      // Other error
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
}

/**
 * Check if a message is likely an email command
 * @param {string} message - User message
 * @returns {boolean} True if message contains email command keywords
 */
export function isEmailCommand(message) {
  const emailKeywords = [
    'email', 'emailed', 'send email', 'send an email', 'send a email',
    'write email', 'write an email', 'write a email', 'compose email',
    'compose an email', 'compose a email', 'draft email', 'draft an email',
    'mail', 'mail to', 'send mail', 'send mail to', 'email to',
    'contact via email', 'reach out via email', 'follow up via email',
    'email about', 'email regarding', 'email concerning', 'email for',
    'email from', 'email to', 'email with', 'email on behalf of'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Check for email keywords
  if (emailKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }
  
  // Check for specific email patterns
  const emailPatterns = [
    /^email\s+.+/i,                    // "email jim about x"
    /^send\s+email\s+.+/i,             // "send email to john"
    /^write\s+email\s+.+/i,            // "write email for sarah"
    /^compose\s+email\s+.+/i,          // "compose email to mike"
    /^draft\s+email\s+.+/i,            // "draft email for client"
    /^mail\s+.+/i,                     // "mail jim martin"
    /^contact\s+.+\s+via\s+email/i,    // "contact john via email"
    /^reach\s+out\s+to\s+.+\s+via\s+email/i, // "reach out to sarah via email"
    /^follow\s+up\s+with\s+.+\s+via\s+email/i, // "follow up with mike via email"
    /^email\s+.+\s+about\s+.+/i,       // "email jim about property showing"
    /^email\s+.+\s+regarding\s+.+/i,   // "email sarah regarding contract"
    /^email\s+.+\s+concerning\s+.+/i,  // "email client concerning offer"
    /^email\s+.+\s+for\s+.+/i,         // "email john for meeting"
    /^email\s+.+\s+from\s+.+/i,        // "email from jim martin"
    /^email\s+.+\s+to\s+.+/i,          // "email to sarah smith"
    /^email\s+.+\s+with\s+.+/i,        // "email with client"
    /^email\s+.+\s+on\s+behalf\s+of\s+.+/i // "email on behalf of company"
  ];
  
  if (emailPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Check for email addresses (contains @ symbol)
  if (message.includes('@')) {
    return true;
  }
  
  return false;
}

/**
 * Process email command and send to AI endpoint
 * @param {string} message - User's email command
 * @returns {Promise<Object>} AI response with email details
 */
export async function processEmailCommand(message) {
  try {
    console.log('🤖 Processing email command:', message);
    
    const result = await handleAIEmail(message);
    console.log('✅ AI Email response:', result);
    
    // If email composition was successful, try to send it
    if (result.success && result.action === 'compose_email' && result.emailData) {
      console.log('📧 Attempting to send composed email...');
      
      try {
        // Import gmailService dynamically to avoid circular dependencies
        const { gmailService } = await import('./gmailService.js');
        
        // Get the current user's Gmail access token
        // Note: This assumes the token is available in the current context
        // You may need to pass this from the ChatBox component
        
        // For now, we'll return the composed email data
        // The actual sending will be handled by the ChatBox component
        console.log('📧 Email composed, ready for sending via Gmail API');
        
        return {
          ...result,
          emailReady: true,
          message: `${result.message}\n\n📧 Email is ready to send! The system will now attempt to send it via Gmail API.`
        };
      } catch (sendError) {
        console.error('❌ Error preparing email for sending:', sendError);
        return {
          ...result,
          emailReady: false,
          message: `${result.message}\n\n⚠️ Email composed but could not be sent: ${sendError.message}`
        };
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error processing email command:', error);
    throw error;
  }
}

export default {
  handleAIEmail,
  isEmailCommand,
  processEmailCommand
};
