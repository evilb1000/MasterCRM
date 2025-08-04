import axios from 'axios';
import { ENDPOINTS } from '../config.js';

/**
 * Handle AI Contact Actions
 * Sends user messages to the AI contact action endpoint for intelligent contact management
 * 
 * @param {string} message - User's natural language command
 * @returns {Promise<Object>} Response from the AI endpoint
 */
export async function handleAIContactAction(message) {
  const endpoint = ENDPOINTS.AI_CONTACT_ACTION;
  
  try {
    const response = await axios.post(endpoint, { 
      command: message 
    });
    
    return response.data;
  } catch (error) {
    console.error('AI Contact Action Error:', error);
    
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
      throw new Error('Unable to connect to AI Contact Actions server. Please check your connection and try again.');
    } else {
      // Other error
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
}

/**
 * Handle AI List Creation
 * Sends user messages to the AI list creation endpoint for intelligent list generation
 * 
 * @param {string} description - User's natural language description of the list they want
 * @returns {Promise<Object>} Response from the AI endpoint
 */
export async function handleAIListCreation(description) {
  const endpoint = ENDPOINTS.AI_CREATE_LIST;
  
  try {
    const response = await axios.post(endpoint, { 
      command: description 
    });
    
    return response.data;
  } catch (error) {
    console.error('AI List Creation Error:', error);
    
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
      throw new Error('Unable to connect to AI List Creation server. Please check your connection and try again.');
    } else {
      // Other error
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
}

/**
 * Check if a message is likely a contact action command
 * @param {string} message - User message
 * @returns {boolean} True if message contains contact action keywords
 */
export function isContactActionCommand(message) {
  // Primary contact action keywords (high priority)
  const primaryKeywords = [
    'update', 'change', 'set', 'modify', 'edit',
    'delete', 'remove', 'add', 'create', 'new contact'
  ];
  
  // Activity creation patterns
  const activityPatterns = [
    /called me/i,
    /emailed me/i,
    /met with/i,
    /texted me/i,
    /showed property to/i,
    /followed up with/i,
    /had a call with/i,
    /had an email with/i,
    /had a meeting with/i,
    /make an activity/i,
    /log this activity/i,
    /create an activity/i,
    /add an activity/i,
    /record this/i,
    /log this/i,
    /log a call/i,
    /log an activity/i,
    /log.*call.*with/i,
    /log.*activity.*with/i,
    /call.*with.*discussed/i,
    /discussed.*with/i
  ];
  
  // Secondary keywords that indicate contact actions when combined with primary
  const secondaryKeywords = [
    'phone', 'email', 'address', 'company', 'name',
    'contact', 'details', 'information'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Check for activity patterns first (these are high priority)
  if (activityPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Check for primary keywords first (these always indicate contact actions)
  if (primaryKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }
  
  // Check for secondary keywords (need to be more specific)
  const hasSecondary = secondaryKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // If it has secondary keywords, check if it's not a list creation command
  if (hasSecondary) {
    // Make sure it's not being classified as list creation
    const listCreationKeywords = ['create list', 'make list', 'build list', 'generate list'];
    const isListCreation = listCreationKeywords.some(keyword => lowerMessage.includes(keyword));
    
    return !isListCreation;
  }
  
  return false;
}

/**
 * Check if a message is likely a list creation command
 * @param {string} message - User message
 * @returns {boolean} True if message contains list creation keywords
 */
export function isListCreationCommand(message) {
  const listKeywords = [
    'create list', 'make list', 'build list', 'generate list',
    'list of', 'show me', 'find all', 'get all',
    'contacts with', 'people from', 'companies in',
    'tech', 'finance', 'healthcare', 'education',
    'sector', 'industry'
  ];
  
  // More specific patterns that indicate list creation
  const specificPatterns = [
    /create.*list/i,
    /make.*list/i,
    /build.*list/i,
    /generate.*list/i,
    /list of.*/i,
    /show me.*/i,
    /find all.*/i,
    /get all.*/i,
    /contacts with.*/i,
    /people from.*/i,
    /companies in.*/i
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Check for specific patterns first
  if (specificPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Then check for general keywords (but exclude if it's clearly a contact action)
  const hasListKeyword = listKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // If it has list keywords but also has contact action keywords, prioritize contact action
  if (hasListKeyword) {
    const contactActionKeywords = ['update', 'change', 'set', 'modify', 'edit', 'delete', 'remove'];
    const hasContactAction = contactActionKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // If it has both, prioritize contact action (return false for list creation)
    if (hasContactAction) {
      return false;
    }
  }
  
  return hasListKeyword;
}

/**
 * Check if a message is a combined list creation and attachment command
 * @param {string} message - User message
 * @returns {boolean} True if message contains combined list creation and attachment keywords
 */
export function isCombinedListCreationAndAttachmentCommand(message) {
  const combinedPatterns = [
    /create.*list.*with.*criteria.*attach.*to.*listing/i,
    /create.*list.*with.*criteria.*then.*attach.*to.*listing/i,
    /make.*list.*with.*criteria.*attach.*to.*listing/i,
    /build.*list.*with.*criteria.*attach.*to.*listing/i,
    /generate.*list.*with.*criteria.*attach.*to.*listing/i,
    /create.*list.*with.*criteria.*and.*attach.*to.*listing/i,
    /create.*list.*with.*criteria.*then.*attach.*to.*listing/i,
    /create.*list.*with.*criteria.*and.*link.*to.*listing/i,
    /create.*list.*with.*criteria.*then.*link.*to.*listing/i,
    /create.*list.*with.*criteria.*and.*connect.*to.*listing/i,
    /create.*list.*with.*criteria.*then.*connect.*to.*listing/i
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Check for specific combined patterns
  if (combinedPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Check for keywords that indicate both list creation and attachment
  const hasListCreation = lowerMessage.includes('create') && lowerMessage.includes('list') && lowerMessage.includes('criteria');
  const hasAttachment = (lowerMessage.includes('attach') || lowerMessage.includes('link') || lowerMessage.includes('connect')) && lowerMessage.includes('listing');
  
  return hasListCreation && hasAttachment;
}

/**
 * Process combined list creation and attachment workflow
 * @param {string} message - User's combined command
 * @returns {Promise<Object>} Response with success/error information
 */
export async function processCombinedListCreationAndAttachment(message) {
  try {
    console.log('🔄 Processing combined list creation and attachment command:', message);
    
    // Send to the AI endpoint that can handle this combined workflow
    const result = await handleAIContactAction(message);
    
    console.log('🔍 Combined workflow response:', result);
    
    // Standardize response format
    return {
      success: true,
      data: result,
      message: result.response || result.message || result.text || 'List created and attached successfully',
      type: 'combined_list_creation_attachment',
      listId: result.listId,
      listName: result.listName,
      listingId: result.listingId,
      listingName: result.listingName,
      contactCount: result.contactCount
    };
  } catch (error) {
    console.error('❌ Combined workflow error:', error);
    return {
      success: false,
      error: error.message,
      type: 'combined_list_creation_attachment_error'
    };
  }
}

/**
 * Enhanced contact action handler with intent detection
 * @param {string} message - User message
 * @returns {Promise<Object>} Response with success/error information
 */
export async function processContactAction(message) {
  try {
    const result = await handleAIContactAction(message);
    
    // Standardize response format
    return {
      success: true,
      data: result,
      message: result.response || result.message || result.text || 'Action completed successfully',
      type: result.type || 'contact_action'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      type: 'contact_action_error'
    };
  }
}

/**
 * Enhanced list creation handler
 * @param {string} description - User's list description
 * @returns {Promise<Object>} Response with success/error information
 */
export async function processListCreation(description) {
  try {
    const result = await handleAIListCreation(description);
    
    console.log('🔍 List Creation Response:', result);
    
    // Standardize response format
    return {
      success: true,
      data: result,
      message: result.message || 'List created successfully',
      type: 'list_creation',
      listId: result.listId,
      listName: result.listName,
      contactCount: result.contactCount,
      contacts: result.contacts
    };
  } catch (error) {
    console.error('❌ List Creation Error:', error);
    return {
      success: false,
      error: error.message,
      type: 'list_creation_error'
    };
  }
} 