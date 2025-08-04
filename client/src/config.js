// Environment configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// API base URL configuration
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : 'https://us-central1-lod-crm-systems.cloudfunctions.net';

// API endpoints
export const ENDPOINTS = {
  AI_CONTACT_ACTION: 'https://aicontactaction-obagwr34kq-uc.a.run.app',
  AI_CREATE_LIST: `${API_BASE_URL}/ai-create-list`,
  CHAT: `${API_BASE_URL}/chat`,
  ADD_CONTACT_LIST_TO_LISTING: 'https://us-central1-lod-crm-systems.cloudfunctions.net/addContactListToListing',
  GET_LISTINGS: 'https://us-central1-lod-crm-systems.cloudfunctions.net/getListings',
  // Activities endpoints
  CREATE_ACTIVITY: `${API_BASE_URL}/activities`,
  GET_ACTIVITIES: `${API_BASE_URL}/activities`,
  GET_CONTACT_ACTIVITIES: `${API_BASE_URL}/activities/contact`,
  UPDATE_ACTIVITY: `${API_BASE_URL}/activities`,
  DELETE_ACTIVITY: `${API_BASE_URL}/activities`
};

export default {
  API_BASE_URL,
  ENDPOINTS,
  isDevelopment,
  isProduction
}; 