import axios from 'axios';
import { ENDPOINTS } from '../config.js';

// Create a new activity
export const createActivity = async (activityData) => {
  try {
    const response = await axios.post(ENDPOINTS.CREATE_ACTIVITY, activityData);
    return response.data;
  } catch (error) {
    console.error('Error creating activity:', error);
    throw error;
  }
};

// Get all activities for a specific contact
export const getContactActivities = async (contactId) => {
  try {
    const response = await axios.get(`${ENDPOINTS.GET_CONTACT_ACTIVITIES}/${contactId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching contact activities:', error);
    throw error;
  }
};

// Get all activities with optional filtering
export const getActivities = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const url = params.toString() ? `${ENDPOINTS.GET_ACTIVITIES}?${params.toString()}` : ENDPOINTS.GET_ACTIVITIES;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw error;
  }
};

// Update an activity
export const updateActivity = async (activityId, updateData) => {
  try {
    const response = await axios.put(`${ENDPOINTS.UPDATE_ACTIVITY}/${activityId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

// Delete an activity
export const deleteActivity = async (activityId) => {
  try {
    const response = await axios.delete(`${ENDPOINTS.DELETE_ACTIVITY}/${activityId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};

// Activity type constants
export const ACTIVITY_TYPES = {
  CALL: 'call',
  EMAIL: 'email',
  MEETING: 'meeting',
  TEXT: 'text',
  NOTE: 'note',
  SHOWING: 'showing',
  FOLLOW_UP: 'follow_up',
  OTHER: 'other'
};

// Activity type labels for display
export const ACTIVITY_TYPE_LABELS = {
  [ACTIVITY_TYPES.CALL]: 'Phone Call',
  [ACTIVITY_TYPES.EMAIL]: 'Email',
  [ACTIVITY_TYPES.MEETING]: 'Meeting',
  [ACTIVITY_TYPES.TEXT]: 'Text Message',
  [ACTIVITY_TYPES.NOTE]: 'Note',
  [ACTIVITY_TYPES.SHOWING]: 'Property Showing',
  [ACTIVITY_TYPES.FOLLOW_UP]: 'Follow Up',
  [ACTIVITY_TYPES.OTHER]: 'Other'
};

// Activity type icons (for future use)
export const ACTIVITY_TYPE_ICONS = {
  [ACTIVITY_TYPES.CALL]: '📞',
  [ACTIVITY_TYPES.EMAIL]: '📧',
  [ACTIVITY_TYPES.MEETING]: '🤝',
  [ACTIVITY_TYPES.TEXT]: '💬',
  [ACTIVITY_TYPES.NOTE]: '📝',
  [ACTIVITY_TYPES.SHOWING]: '🏠',
  [ACTIVITY_TYPES.FOLLOW_UP]: '⏰',
  [ACTIVITY_TYPES.OTHER]: '📋'
};

export default {
  createActivity,
  getContactActivities,
  getActivities,
  updateActivity,
  deleteActivity,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS
}; 