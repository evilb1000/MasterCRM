import axios from 'axios';
import { ENDPOINTS } from '../config.js';

// Helper function to check if a message is a task filtering command
export const isTaskFilteringCommand = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Task filtering patterns
  const taskFilteringPatterns = [
    /\bshow\s+(?:my\s+)?tasks?\s+(?:for\s+)?(today|tomorrow|this\s+week|next\s+week|the\s+week)/i,
    /\bdisplay\s+(?:my\s+)?tasks?\s+(?:for\s+)?(today|tomorrow|this\s+week|next\s+week|the\s+week)/i,
    /\bfind\s+(?:my\s+)?tasks?\s+(?:for\s+)?(today|tomorrow|this\s+week|next\s+week|the\s+week)/i,
    /\bget\s+(?:my\s+)?tasks?\s+(?:for\s+)?(today|tomorrow|this\s+week|next\s+week|the\s+week)/i,
    /\btasks?\s+(?:for\s+)?(today|tomorrow|this\s+week|next\s+week|the\s+week)/i
  ];
  
  return taskFilteringPatterns.some(pattern => pattern.test(message));
};

// Helper function to check if a message is a task creation command
export const isTaskCreationCommand = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // HIGH PRIORITY: Explicit task creation patterns that MUST match
  const explicitTaskPatterns = [
    /\bcreate\s+(?:a\s+)?task\s+for\s+/i,
    /\badd\s+(?:a\s+)?task\s+for\s+/i,
    /\bschedule\s+(?:a\s+)?task\s+for\s+/i,
    /\bnew\s+task\s+for\s+/i
  ];
  
  // Check for explicit task patterns first (highest priority)
  const hasExplicitTaskPattern = explicitTaskPatterns.some(pattern => pattern.test(message));
  
  // If it has explicit task patterns, it's definitely a task creation command
  if (hasExplicitTaskPattern) {
    return true;
  }
  
  // MEDIUM PRIORITY: Task patterns with date indicators
  const taskWithDatePatterns = [
    /\btask\s+for\s+/i,
    /\bcreate\s+task\s+/i,
    /\badd\s+task\s+/i
  ];
  
  const hasTaskWithDatePattern = taskWithDatePatterns.some(pattern => pattern.test(message));
  
  // Check for date/time indicators
  const dateTimeIndicators = [
    'today', 'tomorrow', 'next', 'this', 'in', 'on', 'due', 'by', 'when', 'set date'
  ];
  
  const hasDateTimeIndicator = dateTimeIndicators.some(indicator => lowerMessage.includes(indicator));
  
  // Check for listing-specific keywords (addresses, property terms)
  const listingKeywords = [
    'listing', 'property', 'address', 'street', 'drive', 'avenue', 'road', 'lane', 'court', 'place'
  ];
  
  const hasListingKeyword = listingKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Check for numeric patterns (addresses often contain numbers)
  const hasNumericPattern = /\d+/.test(message);
  
  // Return true if:
  // 1. Has explicit task patterns (highest priority)
  // 2. Has task patterns with date indicators
  // 3. Has task keywords with date indicators
  // 4. Has task keywords with listing keywords (for listing tasks)
  // 5. Has task keywords with numeric patterns (for address-based tasks)
  
  const explicitTaskKeywords = ['create task', 'add task', 'new task', 'schedule task'];
  const hasExplicitTaskKeyword = explicitTaskKeywords.some(keyword => lowerMessage.includes(keyword));
  
  return hasExplicitTaskPattern || 
         (hasTaskWithDatePattern && hasDateTimeIndicator) || 
         (hasExplicitTaskKeyword && hasDateTimeIndicator) ||
         (hasExplicitTaskKeyword && hasListingKeyword) ||
         (hasExplicitTaskKeyword && hasNumericPattern);
};

// Process task creation command
export const processTaskCreation = async (command) => {
  try {
    console.log('🤖 Processing task creation command:', command);
    
    // Call the AI task creation endpoint
    const response = await axios.post(ENDPOINTS.AI_CREATE_TASK, {
      command: command
    });
    
    console.log('✅ Task creation response:', response.data);
    
    if (response.data.success) {
      return {
        success: true,
        message: response.data.message,
        taskId: response.data.taskId,
        task: response.data.task,
        contact: response.data.contact,
        listing: response.data.listing
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Failed to create task',
        details: response.data.details
      };
    }
  } catch (error) {
    console.error('❌ Error in processTaskCreation:', error);
    
    let errorMessage = 'Failed to create task';
    let errorDetails = '';
    
    if (error.response) {
      // Server responded with error status
      if (error.response.data && typeof error.response.data === 'object') {
        errorMessage = error.response.data.error || error.response.data.message || errorMessage;
        errorDetails = error.response.data.details || '';
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`;
      }
    } else if (error.request) {
      // Network error
      errorMessage = 'Network error: Unable to connect to the server';
    } else {
      // Other error
      errorMessage = error.message || errorMessage;
    }
    
    return {
      success: false,
      error: errorMessage,
      details: errorDetails
    };
  }
};

// Process task filtering command
export const processTaskFiltering = async (command) => {
  try {
    console.log('🔍 Processing task filtering command:', command);
    
    // Extract the time period from the command
    const lowerCommand = command.toLowerCase();
    let timePeriod = 'today';
    
    if (lowerCommand.includes('tomorrow')) {
      timePeriod = 'tomorrow';
    } else if (lowerCommand.includes('this week') || lowerCommand.includes('the week')) {
      timePeriod = 'this_week';
    } else if (lowerCommand.includes('next week')) {
      timePeriod = 'next_week';
    }
    
    // Call the AI task filtering endpoint
    const response = await axios.post(ENDPOINTS.AI_FILTER_TASKS, {
      command: command,
      timePeriod: timePeriod
    });
    
    console.log('✅ Task filtering response:', response.data);
    
    if (response.data.success) {
      return {
        success: true,
        message: response.data.message,
        action: 'filter_tasks',
        tasks: response.data.data?.tasks || response.data.tasks,
        timePeriod: timePeriod,
        totalFound: response.data.totalFound
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Failed to filter tasks',
        details: response.data.details
      };
    }
  } catch (error) {
    console.error('❌ Error in processTaskFiltering:', error);
    
    let errorMessage = 'Failed to filter tasks';
    let errorDetails = '';
    
    if (error.response) {
      // Server responded with error status
      if (error.response.data && typeof error.response.data === 'object') {
        errorMessage = error.response.data.error || error.response.data.message || errorMessage;
        errorDetails = error.response.data.details || '';
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`;
      }
    } else if (error.request) {
      // Network error
      errorMessage = 'Network error: Unable to connect to the server';
    } else {
      // Other error
      errorMessage = error.message || errorMessage;
    }
    
    return {
      success: false,
      error: errorMessage,
      details: errorDetails
    };
  }
}; 