// Environment configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// API base URL configuration
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : 'https://us-central1-lod-crm-systems.cloudfunctions.net/api';

// API endpoints
export const ENDPOINTS = {
  AI_CONTACT_ACTION: `${API_BASE_URL}/ai-contact-action`,
  AI_CREATE_LIST: `${API_BASE_URL}/ai-create-list`,
  CHAT: `${API_BASE_URL}/chat`
};

export default {
  API_BASE_URL,
  ENDPOINTS,
  isDevelopment,
  isProduction
}; 