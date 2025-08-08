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
  
  // Contact filtering patterns (HIGHEST PRIORITY)
  const contactFilteringPatterns = [
    /^show\s+me\s+all\s+contacts\s+with/i,
    /^show\s+me\s+contacts\s+with/i,
    /^find\s+contacts\s+with/i,
    /^display\s+contacts\s+with/i,
    /^get\s+contacts\s+with/i,
    /^contacts\s+with/i
  ];
  
  // Secondary keywords that indicate contact actions when combined with primary
  const secondaryKeywords = [
    'phone', 'email', 'address', 'company', 'name',
    'contact', 'details', 'information'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Check for contact filtering patterns first (HIGHEST PRIORITY)
  if (contactFilteringPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Check for activity patterns (these are high priority)
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
  
  // More specific patterns that indicate list creation (but exclude task-related patterns)
  const specificPatterns = [
    /^create\s+(?!.*task).*list/i,  // create list but NOT create task
    /^make\s+(?!.*task).*list/i,    // make list but NOT make task
    /^build\s+(?!.*task).*list/i,   // build list but NOT build task
    /^generate\s+(?!.*task).*list/i, // generate list but NOT generate task
    /^list\s+of.*/i,                // list of (at start)
    // Removed "show me" pattern - now handled by contact actions for filtering
    /^find\s+all.*/i,               // find all (at start)
    /^get\s+all.*/i,                // get all (at start)
    /contacts\s+with.*/i,           // contacts with
    /people\s+from.*/i,             // people from
    /companies\s+in.*/i             // companies in
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // EXCLUDE: If message contains task-related keywords, it's NOT a list creation
  const taskKeywords = ['task', 'tasks', 'create task', 'add task', 'new task', 'schedule task'];
  const hasTaskKeyword = taskKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (hasTaskKeyword) {
    return false;
  }
  
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
 * Check if a message is a combined activity creation and listing attachment command
 * @param {string} message - User message
 * @returns {boolean} True if message contains combined activity creation and listing attachment keywords
 */
export function isCombinedActivityCreationAndListingAttachmentCommand(message) {
  const combinedPatterns = [
    /(emailed|called|texted|met with|toured|showed).*for.*listing/i,
    /(emailed|called|texted|met with|toured|showed).*at.*listing/i,
    /(emailed|called|texted|met with|toured|showed).*about.*for.*listing/i,
    /(emailed|called|texted|met with|toured|showed).*regarding.*listing/i,
    /(emailed|called|texted|met with|toured|showed).*concerning.*listing/i,
    /(emailed|called|texted|met with|toured|showed).*with.*at.*listing/i
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Check for specific combined patterns
  if (combinedPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Check for keywords that indicate both activity creation and listing attachment
  const hasActivity = (lowerMessage.includes('emailed') || lowerMessage.includes('called') || lowerMessage.includes('texted') || lowerMessage.includes('met with') || lowerMessage.includes('toured') || lowerMessage.includes('showed'));
  const hasListing = lowerMessage.includes('listing') || lowerMessage.includes('at') || lowerMessage.includes('for') || lowerMessage.includes('about');
  
  return hasActivity && hasListing;
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
 * Process combined activity creation and listing attachment workflow
 * @param {string} message - User's combined command
 * @returns {Promise<Object>} Response with success/error information
 */
export async function processCombinedActivityCreationAndListingAttachment(message) {
  try {
    console.log('🔄 Processing combined activity creation and listing attachment command:', message);
    
    // Send to the AI endpoint that can handle this combined workflow
    const result = await handleAIContactAction(message);
    
    console.log('🔍 Combined activity workflow response:', result);
    
    // Standardize response format
    return {
      success: true,
      data: result,
      message: result.response || result.message || result.text || 'Activity created and attached successfully',
      type: 'combined_activity_creation_listing_attachment',
      activityId: result.activityId,
      activityType: result.activityType,
      contactId: result.contactId,
      contactName: result.contactName,
      listingId: result.listingId,
      listingName: result.listingName,
      activityDescription: result.activityDescription
    };
  } catch (error) {
    console.error('❌ Combined activity workflow error:', error);
    return {
      success: false,
      error: error.message,
      type: 'combined_activity_creation_listing_attachment_error'
    };
  }
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
    console.log('🔄 Processing contact action command:', message);
    
    const result = await handleAIContactAction(message);
    
    console.log('🔍 Contact Action Response:', result);
    
    // Standardize response format
    return {
      success: true,
      data: result,
      message: result.response || result.message || result.text || 'Action completed successfully',
      type: result.type || 'contact_action',
      action: result.action // Preserve the action field for filtering
    };
  } catch (error) {
    console.error('❌ Contact Action Error:', error);
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

/**
 * Check if a message is a business prospecting command
 * @param {string} message - User message
 * @returns {boolean} True if message contains business prospecting keywords
 */
export function isBusinessProspectingCommand(message) {
  const prospectingKeywords = [
    'find', 'search', 'prospect', 'locate', 'get',
    'businesses', 'companies', 'business', 'company'
  ];
  
  const locationKeywords = [
    'in', 'at', 'near', 'around', 'within', 'located in'
  ];
  
  const businessCategoryKeywords = [
    'financial services', 'restaurants', 'tech', 'healthcare', 'manufacturing',
    'retail', 'construction', 'real estate', 'legal', 'accounting',
    'insurance', 'banking', 'consulting', 'marketing', 'advertising'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Check for business prospecting patterns (MUST include business/company keywords)
  const prospectingPatterns = [
    /find.*businesses?.*in/i,
    /search.*for.*businesses?.*in/i,
    /prospect.*businesses?.*in/i,
    /locate.*businesses?.*in/i,
    /find.*companies?.*in/i,
    /search.*for.*companies?.*in/i,
    /prospect.*companies?.*in/i,
    /locate.*companies?.*in/i,
    /find.*\w+.*businesses?.*in/i,
    /search.*for.*\w+.*businesses?.*in/i,
    /prospect.*\w+.*businesses?.*in/i,
    /locate.*\w+.*businesses?.*in/i
  ];
  
  // Check for specific patterns first
  if (prospectingPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // EXCLUDE contact filtering commands first
  const contactFilteringPatterns = [
    /show.*me.*contacts.*with/i,
    /find.*contacts.*with/i,
    /display.*contacts.*with/i,
    /get.*contacts.*with/i,
    /contacts.*with/i
  ];
  
  if (contactFilteringPatterns.some(pattern => pattern.test(message))) {
    return false; // This is contact filtering, not business prospecting
  }
  
  // Check for keywords that indicate business prospecting
  const hasProspectingKeyword = prospectingKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasLocationKeyword = locationKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasBusinessCategory = businessCategoryKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Must have prospecting keyword and location keyword, or business category
  return hasProspectingKeyword && (hasLocationKeyword || hasBusinessCategory);
}

/**
 * Process business prospecting workflow
 * @param {string} message - User's business prospecting command
 * @returns {Promise<Object>} Response with success/error information
 */
export async function processBusinessProspecting(message) {
  try {
    console.log('🔄 Processing business prospecting command:', message);
    
    // Send to the AI endpoint that can handle business prospecting
    const result = await handleAIContactAction(message);
    
    console.log('🔍 Business prospecting response:', result);
    
    // Standardize response format
    return {
      success: true,
      data: result,
      message: result.message || 'Business prospecting completed successfully',
      type: 'business_prospecting',
      businessesFound: result.businessesFound || 0,
      searchLocation: result.data?.searchLocation,
      searchTerms: result.data?.searchTerms,
      businesses: result.data?.businesses || []
    };
  } catch (error) {
    console.error('❌ Business prospecting error:', error);
    return {
      success: false,
      error: error.message,
      type: 'business_prospecting_error'
    };
  }
} 