import axios from 'axios';
import { ENDPOINTS } from '../config.js';

// Helper function to check if a message is a task creation command
export const isTaskCreationCommand = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Primary task creation patterns (highest priority)
  const primaryTaskPatterns = [
    /\bcreate\s+(?:a\s+)?task\s+for\s+/i,
    /\badd\s+(?:a\s+)?task\s+for\s+/i,
    /\bschedule\s+(?:a\s+)?task\s+for\s+/i,
    /\bnew\s+task\s+for\s+/i
  ];
  
  // Check if message contains primary task creation patterns
  const hasPrimaryTaskPattern = primaryTaskPatterns.some(pattern => pattern.test(message));
  
  // Secondary task patterns (lower priority)
  const secondaryTaskPatterns = [
    /\btask\s+for\s+/i,
    /\bcreate\s+task\s+/i,
    /\badd\s+task\s+/i
  ];
  
  const hasSecondaryTaskPattern = secondaryTaskPatterns.some(pattern => pattern.test(message));
  
  // Check for explicit task keywords
  const explicitTaskKeywords = [
    'create task', 'add task', 'new task', 'schedule task'
  ];
  
  const hasExplicitTaskKeyword = explicitTaskKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Check for date/time indicators
  const dateTimeIndicators = [
    'today', 'tomorrow', 'next', 'this', 'in', 'on', 'due', 'by', 'when'
  ];
  
  const hasDateTimeIndicator = dateTimeIndicators.some(indicator => lowerMessage.includes(indicator));
  
  // Return true if it has primary task patterns OR (secondary patterns AND date/time indicators)
  return hasPrimaryTaskPattern || (hasSecondaryTaskPattern && hasDateTimeIndicator) || (hasExplicitTaskKeyword && hasDateTimeIndicator);
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
        contact: response.data.contact
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