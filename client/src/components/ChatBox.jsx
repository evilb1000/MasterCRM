import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ENDPOINTS } from '../config.js';
import { handleAIContactAction, isContactActionCommand, processContactAction, isListCreationCommand, processListCreation, isCombinedListCreationAndAttachmentCommand, processCombinedListCreationAndAttachment, isCombinedActivityCreationAndListingAttachmentCommand, processCombinedActivityCreationAndListingAttachment, isBusinessProspectingCommand, processBusinessProspecting } from '../services/aiContactActions';
import { isTaskCreationCommand, processTaskCreation } from '../services/aiTaskActions';

// Helper function to check if a query is CRM-related
function isCRMQuery(message) {
  const lowerMessage = message.toLowerCase();
  
  // First, check for obvious non-CRM topics that should be blocked
  const nonCRMTopics = [
    'batman', 'superman', 'spiderman', 'iron man', 'captain america', 'avengers',
    'marvel', 'dc comics', 'superhero', 'superheroes', 'comic book', 'comic books',
    'movie', 'movies', 'film', 'films', 'television', 'tv show', 'tv shows',
    'book', 'books', 'novel', 'novels', 'story', 'stories', 'fiction',
    'weather', 'temperature', 'forecast', 'sports', 'football', 'basketball',
    'baseball', 'soccer', 'music', 'song', 'songs', 'artist', 'artists',
    'politics', 'political', 'news', 'current events', 'history', 'historical',
    'science', 'scientific', 'math', 'mathematics', 'physics', 'chemistry',
    'cooking', 'recipe', 'recipes', 'food', 'restaurant', 'restaurants',
    'travel', 'vacation', 'trip', 'destination', 'hotel', 'hotels'
  ];
  
  // If message contains any non-CRM topics, it's not CRM-related
  if (nonCRMTopics.some(topic => lowerMessage.includes(topic))) {
    return false;
  }
  
  // CRM-related keywords and patterns (more specific)
  const crmKeywords = [
    // Contact management
    'contact', 'contacts', 'person', 'people', 'client', 'customer', 'lead',
    'update', 'edit', 'change', 'modify', 'set', 'add', 'delete', 'remove',
    'name', 'email', 'phone', 'company', 'address', 'business', 'sector',
    'linkedin', 'notes', 'note', 'new contact', 'create contact',
    
    // Activity logging
    'activity', 'activities', 'log', 'logged', 'call', 'email', 'meeting',
    'showing', 'appointment', 'discussed', 'discussion', 'talked', 'spoke',
    
    // List management
    'list', 'lists', 'create', 'make', 'build', 'generate', 'show', 'display',
    'find', 'search', 'filter', 'criteria', 'group', 'category',
    
    // List-to-listing attachment
    'attach', 'connect', 'link', 'send', 'listing', 'property', 'real estate',
    
    // CRM system
    'crm', 'system', 'help', 'assist', 'how to', 'what can', 'guide',
    'manage', 'organize', 'track', 'record', 'database'
  ];
  
  // Check if message contains any CRM keywords
  const hasCRMKeyword = crmKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // More specific CRM patterns (avoid generic patterns)
  const crmPatterns = [
    /\b(update|edit|change|modify|set)\s+(contact|person|client|customer|name|email|phone|company|address)/i,
    /\b(add|create|make|build|generate)\s+(contact|list|activity|note)/i,
    /\b(log|record|track)\s+(call|email|meeting|activity|contact)/i,
    /\b(find|search|show|display)\s+(contact|person|client|customer|list)/i,
    /\b(contact|person|client|customer)\s+(management|info|information|details)/i,
    /\b(activity|call|email|meeting|showing)\s+(log|logged|record|track)/i,
    /\b(list|group|category)\s+(create|make|build|generate|show|display)/i,
    /\b(new|create|add)\s+contact/i,
    /\bcontact\s+(for|with|named)/i,
    /\b(attach|connect|link|send)\s+(list|.*list)\s+to\s+(listing|property|.*listing)/i,
    /\b(list|.*list)\s+to\s+(listing|property|.*listing)/i
  ];
  
  const hasCRMPattern = crmPatterns.some(pattern => pattern.test(message));
  
  // Return true only if it has specific CRM patterns or keywords
  return hasCRMKeyword || hasCRMPattern;
}

const isShowListsCommand = (msg) => {
  const phrases = [
    'show me my lists',
    'show my lists',
    'display my lists',
    'list my lists',
    'what are my lists',
    'see my lists',
    'show contact lists',
    'show all lists',
    'show lists',
  ];
  const lower = msg.toLowerCase();
  return phrases.some(p => lower.includes(p));
};

const isShowContactCommand = (msg) => {
  const patterns = [
    /^show me (.+)$/i,
    /^show (.+)$/i,
    /^display (.+)$/i,
    /^find (.+)$/i,
    /^look up (.+)$/i,
    /^get (.+)$/i,
  ];
  
  const lower = msg.toLowerCase();
  
  // Check if it matches any of the patterns
  for (const pattern of patterns) {
    const match = msg.match(pattern);
    if (match) {
      const contactName = match[1].trim();
      // Make sure it's not a list command or contacts with command
      if (!lower.includes('list') && !lower.includes('lists') && !lower.includes('contacts with')) {
        return { isCommand: true, contactName };
      }
    }
  }
  
  return { isCommand: false, contactName: null };
};

const isShowContactsWithCommand = (msg) => {
  const patterns = [
    /^show me contacts with (.+)$/i,
    /^show contacts with (.+)$/i,
    /^display contacts with (.+)$/i,
    /^find contacts with (.+)$/i,
    /^get contacts with (.+)$/i,
    /^contacts with (.+)$/i,
    // More specific patterns to avoid conflicts with list creation
    /^show me all contacts with (.+)$/i,
    /^find all contacts with (.+)$/i,
    /^get all contacts with (.+)$/i,
    /^display all contacts with (.+)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = msg.match(pattern);
    if (match) {
      const searchCriteria = match[1].trim();
      return { isCommand: true, searchCriteria };
    }
  }
  
  return { isCommand: false, searchCriteria: null };
};

const analyzeSearchField = (searchTerm) => {
  const term = searchTerm.toLowerCase();
  
  // Business sector keywords
  const businessSectorKeywords = [
    'financial', 'finance', 'banking', 'insurance', 'real estate', 'healthcare', 'medical', 'dental',
    'legal', 'law', 'technology', 'tech', 'software', 'consulting', 'retail', 'restaurant', 'food',
    'automotive', 'auto', 'construction', 'manufacturing', 'education', 'school', 'university',
    'government', 'nonprofit', 'charity', 'marketing', 'advertising', 'media', 'entertainment'
  ];
  
  // Location keywords
  const locationKeywords = [
    'pittsburgh', 'mt. lebanon', 'bethel park', 'bridgeville', 'south hills', 'north hills',
    'east end', 'west end', 'downtown', 'oakland', 'shadyside', 'squirrel hill', 'lawrenceville',
    'strip district', 'south side', 'north side', 'east liberty', 'bloomfield', 'garfield'
  ];
  
  // Check if it's a business sector
  if (businessSectorKeywords.some(keyword => term.includes(keyword))) {
    return 'businessSector';
  }
  
  // Check if it's a location
  if (locationKeywords.some(keyword => term.includes(keyword))) {
    return 'address';
  }
  
  // Default to company search (most common for business names)
  return 'company';
};

const ChatBox = ({ onShowLists, onShowContact, onShowContactsWith, onShowContactDetail }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastActionType, setLastActionType] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [showBusinessResults, setShowBusinessResults] = useState(false);
  const [businessResults, setBusinessResults] = useState(null);
  const [showContactFilterResults, setShowContactFilterResults] = useState(false);
  const [contactFilterResults, setContactFilterResults] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for business results events
  useEffect(() => {
    const handleBusinessResults = (event) => {
      setBusinessResults(event.detail);
      setShowBusinessResults(true);
    };

    window.addEventListener('showBusinessResults', handleBusinessResults);
    
    return () => {
      window.removeEventListener('showBusinessResults', handleBusinessResults);
    };
  }, []);

  // Listen for contact filter results events
  useEffect(() => {
    const handleContactFilterResults = (event) => {
      setContactFilterResults(event.detail);
      setShowContactFilterResults(true);
    };

    window.addEventListener('showContactFilterResults', handleContactFilterResults);
    
    return () => {
      window.removeEventListener('showContactFilterResults', handleContactFilterResults);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    // Detect "show me my lists" and open modal
    if (isShowListsCommand(message)) {
      if (onShowLists) onShowLists();
      setMessage('');
      setLastActionType('show_lists');
      return;
    }

    // Detect "show me [contact name]" and open contact modal
    const contactCommand = isShowContactCommand(message);
    if (contactCommand.isCommand) {
      if (onShowContact) onShowContact(contactCommand.contactName);
      setMessage('');
      setLastActionType('show_contact');
      return;
    }

    // Note: Contact filtering is now handled by the AI endpoint
    // The command detection is kept for fallback but will be processed by AI

    // Store the message content before clearing the input
    const currentMessage = message;
    
    // Clear the input immediately for instant feedback
    setMessage('');
    
    // Add user message to conversation IMMEDIATELY
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    setLoading(true);
    setError('');
    setLastActionType('');

    try {
      let responseText = '';
      let actionType = '';

      // Debug: Log which command type is detected
      const isCombinedList = isCombinedListCreationAndAttachmentCommand(currentMessage);
      const isCombinedActivity = isCombinedActivityCreationAndListingAttachmentCommand(currentMessage);
      const isContact = isContactActionCommand(currentMessage);
      const isBusinessProspecting = isBusinessProspectingCommand(currentMessage);
      const isTaskCreation = isTaskCreationCommand(currentMessage);
      console.log('🔍 Command Analysis:', {
        message: currentMessage,
        isCombinedListCreationAndAttachment: isCombinedList,
        isCombinedActivityCreationAndListingAttachment: isCombinedActivity,
        isContactAction: isContact,
        isBusinessProspecting: isBusinessProspecting,
        isTaskCreation: isTaskCreation
      });
      
      // Additional debugging for activity patterns
      if (currentMessage.toLowerCase().includes('log') || currentMessage.toLowerCase().includes('call')) {
        console.log('🔍 Activity pattern detected in message:', currentMessage);
      }

      // Check if this is a task creation command (HIGHEST PRIORITY - before list creation)
      if (isTaskCreation) {
        console.log('📋 Routing to Task Creation endpoint');
        const result = await processTaskCreation(currentMessage);
        
        if (result.success) {
          // Handle both contact and listing tasks
          if (result.contact) {
            // Contact task
            responseText = `${result.message}\n\nTask Details:\n- Title: ${result.task.title}\n- Description: ${result.task.description}\n- Due Date: ${result.task.dueDate}\n- Priority: ${result.task.priority}\n- Status: ${result.task.status}\n- Task ID: ${result.taskId}\n\nContact: ${result.contact.firstName} ${result.contact.lastName} (${result.contact.email})`;
            
            // Emit a custom event to refresh tasks
            console.log('🎯 AI Contact Task created, dispatching refresh event');
            window.dispatchEvent(new CustomEvent('aiTaskCreated', {
              detail: {
                taskId: result.taskId,
                contactId: result.contact.id,
                taskTitle: result.task.title,
                dueDate: result.task.dueDate
              }
            }));
          } else if (result.listing) {
            // Listing task
            const listingName = result.listing.streetAddress || result.listing.address || result.listing.name || 'Unknown Listing';
            responseText = `${result.message}\n\nTask Details:\n- Title: ${result.task.title}\n- Description: ${result.task.description}\n- Due Date: ${result.task.dueDate}\n- Priority: ${result.task.priority}\n- Status: ${result.task.status}\n- Task ID: ${result.taskId}\n\nListing: ${listingName}`;
            
            // Emit a custom event to refresh tasks
            console.log('🎯 AI Listing Task created, dispatching refresh event');
            window.dispatchEvent(new CustomEvent('aiTaskCreated', {
              detail: {
                taskId: result.taskId,
                listingId: result.listing.id,
                taskTitle: result.task.title,
                dueDate: result.task.dueDate
              }
            }));
          }
          
          actionType = 'task_creation';
        } else {
          throw new Error(result.error);
        }
      }
      // Check if this is a combined activity creation and listing attachment command
      else if (isCombinedActivity) {
        console.log('🔄 Routing to Combined Activity Creation and Listing Attachment endpoint');
        const result = await processCombinedActivityCreationAndListingAttachment(currentMessage);
        
        if (result.success) {
          responseText = `${result.message}\n\nActivity Details:\n- Type: ${result.activityType}\n- Contact: ${result.contactName}\n- Description: ${result.activityDescription}\n- Activity ID: ${result.activityId}\n\nListing Details:\n- Name: ${result.listingName}\n- ID: ${result.listingId}`;
          actionType = 'combined_activity_creation_listing_attachment';
        } else {
          throw new Error(result.error);
        }
      }
      // Check if this is a combined list creation and attachment command
      else if (isCombinedList) {
        console.log('🔄 Routing to Combined List Creation and Attachment endpoint');
        const result = await processCombinedListCreationAndAttachment(currentMessage);
        
        if (result.success) {
          responseText = `${result.message}\n\nList Details:\n- Name: ${result.listName}\n- Contacts: ${result.contactCount}\n- ID: ${result.listId}\n\nListing Details:\n- Name: ${result.listingName}\n- ID: ${result.listingId}`;
          actionType = 'combined_list_creation_attachment';
        } else {
          throw new Error(result.error);
        }
      }
      // Check if this is a contact action command (includes contact filtering) - HIGHEST PRIORITY
      else if (isContact) {
        console.log('👤 Routing to Contact Action endpoint');
        // Use AI Contact Actions endpoint
        const result = await processContactAction(currentMessage);
        
        if (result.success) {
          responseText = result.message;
          
          // Check if this is a contact filtering response
          if (result.action === 'filter_contacts') {
            actionType = 'filter_contacts';
            console.log('🔍 Contact filtering response detected:', result);
            
            // Store contact data for modal display
            // The contacts are nested in result.data.data.contacts
            const contacts = result.data?.data?.contacts || result.data?.contacts;
            if (contacts && contacts.length > 0) {
              console.log('🔍 Triggering contact filtering modal with', contacts.length, 'contacts');
              
              // Set state for contact filtering results
              setContactFilterResults({
                contacts: contacts,
                searchField: result.data.searchField || result.searchField,
                filterCriteria: result.data.filterCriteria || result.filterCriteria,
                totalFound: result.data.totalFound || result.contactsFound
              });
              setShowContactFilterResults(true);
              
              // Note: Removed call to old modal system since our new AI-powered modal is working correctly
            }
          } else {
            actionType = 'contact_action';
          }
          
          // If this was an activity creation, emit a custom event
          if (result.data && result.data.action === 'create_activity') {
            console.log('🎯 AI Activity created, dispatching refresh event');
            window.dispatchEvent(new CustomEvent('aiActivityCreated', {
              detail: {
                contactId: result.data.contactId,
                activityType: result.data.activityType,
                activityId: result.data.activityId
              }
            }));
          }
        } else {
          throw new Error(result.error);
        }
      }
      // Check if this is a business prospecting command (after contact actions)
      else if (isBusinessProspecting) {
        console.log('🏢 Routing to Business Prospecting endpoint');
        const result = await processBusinessProspecting(currentMessage);
        
        if (result.success) {
          responseText = result.message;
          actionType = 'business_prospecting';
          
          // Store business data for modal display
          if (result.businesses && result.businesses.length > 0) {
            // Trigger business results modal
            window.dispatchEvent(new CustomEvent('showBusinessResults', {
              detail: {
                businesses: result.businesses,
                searchLocation: result.searchLocation,
                searchTerms: result.searchTerms,
                businessesFound: result.businessesFound
              }
            }));
          }
        } else {
          throw new Error(result.error);
        }
      }
      // Check if this is a task creation command (HIGHEST PRIORITY - before list creation)
      else if (isTaskCreation) {
        console.log('📋 Routing to Task Creation endpoint');
        const result = await processTaskCreation(currentMessage);
        
        if (result.success) {
          // Handle both contact and listing tasks
          if (result.contact) {
            // Contact task
            responseText = `${result.message}\n\nTask Details:\n- Title: ${result.task.title}\n- Description: ${result.task.description}\n- Due Date: ${result.task.dueDate}\n- Priority: ${result.task.priority}\n- Status: ${result.task.status}\n- Task ID: ${result.taskId}\n\nContact: ${result.contact.firstName} ${result.contact.lastName} (${result.contact.email})`;
            
            // Emit a custom event to refresh tasks
            console.log('🎯 AI Contact Task created, dispatching refresh event');
            window.dispatchEvent(new CustomEvent('aiTaskCreated', {
              detail: {
                taskId: result.taskId,
                contactId: result.contact.id,
                taskTitle: result.task.title,
                dueDate: result.task.dueDate
              }
            }));
          } else if (result.listing) {
            // Listing task
            const listingName = result.listing.streetAddress || result.listing.address || result.listing.name || 'Unknown Listing';
            responseText = `${result.message}\n\nTask Details:\n- Title: ${result.task.title}\n- Description: ${result.task.description}\n- Due Date: ${result.task.dueDate}\n- Priority: ${result.task.priority}\n- Status: ${result.task.status}\n- Task ID: ${result.taskId}\n\nListing: ${listingName}`;
            
            // Emit a custom event to refresh tasks
            console.log('🎯 AI Listing Task created, dispatching refresh event');
            window.dispatchEvent(new CustomEvent('aiTaskCreated', {
              detail: {
                taskId: result.taskId,
                listingId: result.listing.id,
                taskTitle: result.task.title,
                dueDate: result.task.dueDate
              }
            }));
          }
          
          actionType = 'task_creation';
        } else {
          throw new Error(result.error);
        }
      } else {
        // FALLBACK: Send ambiguous commands to AI for contextual understanding
        console.log('🤖 Routing to AI for contextual understanding');
        const result = await processContactAction(currentMessage);
        
        if (result.success) {
          responseText = result.message;
          
          // Handle different AI response types
          if (result.action === 'filter_contacts') {
            actionType = 'filter_contacts';
            console.log('🔍 AI detected contact filtering:', result);
            
            const contacts = result.data?.data?.contacts || result.data?.contacts;
            if (contacts && contacts.length > 0) {
              setContactFilterResults({
                contacts: contacts,
                searchField: result.data.searchField || result.searchField,
                filterCriteria: result.data.filterCriteria || result.filterCriteria,
                totalFound: result.data.totalFound || result.contactsFound
              });
              setShowContactFilterResults(true);
            }
          } else if (result.action === 'prospect_businesses') {
            actionType = 'business_prospecting';
            console.log('🏢 AI detected business prospecting:', result);
            
            // Debug: Log the full result structure to understand the data layout
            console.log('🏢 Full result structure:', JSON.stringify(result, null, 2));
            
            // Extract business data from the AI response structure
            // The data might be nested in result.data.data or result.data
            const businessData = result.data?.data || result.data || {};
            const businesses = businessData.businesses || [];
            
            console.log('🏢 Business data extracted:', {
              businesses: businesses.length,
              searchLocation: businessData.searchLocation,
              searchTerms: businessData.searchTerms,
              businessesFound: result.businessesFound || businesses.length
            });
            
            if (businesses.length > 0) {
              console.log('🏢 Triggering business results modal with', businesses.length, 'businesses');
              window.dispatchEvent(new CustomEvent('showBusinessResults', {
                detail: {
                  businesses: businesses,
                  searchLocation: businessData.searchLocation,
                  searchTerms: businessData.searchTerms,
                  businessesFound: result.businessesFound || businesses.length
                }
              }));
            } else {
              console.log('🏢 No businesses found in response data');
              console.log('🏢 Available data keys:', Object.keys(businessData));
            }
          } else {
            actionType = 'ai_contact_action';
          }
          
          // Handle activity creation events
          if (result.data && result.data.action === 'create_activity') {
            console.log('🎯 AI Activity created, dispatching refresh event');
            window.dispatchEvent(new CustomEvent('aiActivityCreated', {
              detail: {
                contactId: result.data.contactId,
                activityType: result.data.activityType,
                activityId: result.data.activityId
              }
            }));
          }
        } else {
          // If AI fails, check if this is a CRM-related query before routing to general chat
          const isCRMRelated = isCRMQuery(currentMessage);
          if (!isCRMRelated) {
            console.log('🚫 Non-CRM query detected, returning CRM-only message');
            responseText = "I am only trained to provide assistance within the confines of the CRM system. Please ask me about contact management, activity logging, list creation, or other CRM-related tasks.";
            actionType = 'crm_only';
          } else {
            console.log('💬 Routing to General Chat endpoint');
            // Use regular chat endpoint
            const chatResult = await axios.post(ENDPOINTS.CHAT, {
              message: currentMessage
            });
          
            // Better response handling to prevent crashes
            if (chatResult.data) {
              if (typeof chatResult.data === 'string') {
                responseText = chatResult.data;
              } else if (chatResult.data.reply) {
                responseText = chatResult.data.reply;
              } else if (chatResult.data.response) {
                responseText = chatResult.data.response;
              } else if (chatResult.data.message) {
                responseText = chatResult.data.message;
              } else if (chatResult.data.text) {
                responseText = chatResult.data.text;
              } else {
                // Fallback: stringify the entire response for debugging
                responseText = JSON.stringify(chatResult.data, null, 2);
              }
            }
            actionType = 'chat';
          }
        }
      }
      
      // Add AI response to conversation
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: responseText,
        actionType: actionType,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setLastActionType(actionType);
    } catch (err) {
      console.error('Chat error:', err);
      let errorMessage = 'An error occurred while sending the message';
      
      if (err.response) {
        // Server responded with error status
        if (err.response.data && typeof err.response.data === 'object') {
          errorMessage = err.response.data.error || err.response.data.message || errorMessage;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else {
          errorMessage = `Server error: ${err.response.status} ${err.response.statusText}`;
        }
      } else if (err.request) {
        // Network error
        errorMessage = 'Network error: Unable to connect to the server';
      } else {
        // Other error
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAboutClick = () => {
    setShowAbout(true);
  };

  return (
    <div style={styles.container}>
      {/* Conversation Display Area */}
      <div style={styles.responseArea}>
        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <span>Loading response...</span>
          </div>
        )}
        
        {error && (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
            <button 
              onClick={() => setError('')} 
              style={styles.clearButton}
            >
              Clear Error
            </button>
          </div>
        )}
        
        {/* Messages */}
        <div style={styles.messagesContainer}>
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              style={{
                ...styles.message,
                ...(msg.type === 'user' ? styles.userMessage : styles.aiMessage)
              }}
            >
              <div style={styles.messageHeader}>
                <strong style={styles.messageSender}>
                  {msg.type === 'user' ? 'You' : 'AI Assistant'}
                </strong>
                {msg.actionType && msg.actionType !== 'chat' && (
                  <span style={styles.actionBadge}>
                    {msg.actionType === 'contact_action' ? 'AI Contact Management' : 
                     msg.actionType === 'list_creation' ? 'AI List Creation' : 
                     msg.actionType === 'business_prospecting' ? 'Business Prospecting' :
                     msg.actionType === 'show_lists' ? 'Contact Lists' :
                     msg.actionType === 'show_contact' ? 'Contact Display' :
                     msg.actionType === 'show_contacts_with' ? 'Contact Filtering' :
                     msg.actionType === 'filter_contacts' ? 'AI Contact Filtering' : 'AI Action'}
                  </span>
                )}
                <span style={styles.messageTime}>
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div style={styles.messageContent}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {messages.length === 0 && !loading && !error && (
          <div style={styles.placeholder}>
            Start a conversation with your AI assistant...
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={{ ...styles.inputContainer, flexDirection: 'column', gap: 8 }}>
          {/* About Button (now inside input area) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button 
              onClick={handleAboutClick}
              style={styles.aboutButton}
              className="about-button"
              type="button"
            >
              About
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              style={styles.textarea}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !message.trim()}
              style={styles.button}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </form>

      {/* About Modal */}
      {showAbout && (
        <div style={styles.modalOverlay} onClick={() => setShowAbout(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>AI Commands Guide</h2>
              <button 
                onClick={() => setShowAbout(false)}
                style={styles.closeButton}
                className="close-button"
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <h3 style={styles.sectionTitle}>🤖 Contact Management</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Update Contact:</strong> "update contact [name]'s [field] to [value]"</li>
                <li><strong>Edit Contact:</strong> "edit [name]'s [field] to [value]"</li>
                <li><strong>Change Contact:</strong> "change [name]'s [field] to [value]"</li>
                <li><strong>Set Contact:</strong> "set [name]'s [field] to [value]"</li>
                <li><strong>Add Note:</strong> "add a note to [name] saying [note]"</li>
                <li><strong>Add Note:</strong> "add note to [name]: [note]"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>📞 Activity Creation</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Log Call:</strong> "log a call with [name]. We discussed [topic]"</li>
                <li><strong>Log Call:</strong> "[name] called me and we discussed [topic]. Please log this activity."</li>
                <li><strong>Log Email:</strong> "log an email with [name]. We discussed [topic]"</li>
                <li><strong>Log Meeting:</strong> "log a meeting with [name]. We discussed [topic]"</li>
                <li><strong>Log Showing:</strong> "log a showing with [name]. We discussed [topic]"</li>
                <li><strong>Log Activity:</strong> "log an activity with [name]. We discussed [topic]"</li>
                <li><strong>Create Activity:</strong> "create an activity for [name]. We discussed [topic]"</li>
                <li><strong>Make Activity:</strong> "make an activity for [name]. We discussed [topic]"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>📋 List Creation</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Create List:</strong> "create list of [criteria]"</li>
                <li><strong>Make List:</strong> "make list of [criteria]"</li>
                <li><strong>Build List:</strong> "build list of [criteria]"</li>
                <li><strong>Generate List:</strong> "generate list of [criteria]"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>👤 Contact Display</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Show Contact:</strong> "show me [name]"</li>
                <li><strong>Display Contact:</strong> "display [name]"</li>
                <li><strong>Find Contact:</strong> "find [name]"</li>
                <li><strong>Look Up Contact:</strong> "look up [name]"</li>
                <li><strong>Get Contact:</strong> "get [name]"</li>
                <li><strong>Examples:</strong> "show me Elodie Wren", "find John Smith"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>🔍 Contact Filtering</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Filter by Sector:</strong> "show me contacts with financial services"</li>
                <li><strong>Filter by Location:</strong> "show me contacts with Pittsburgh"</li>
                <li><strong>Filter by Company:</strong> "show me contacts with ABC Corp"</li>
                <li><strong>Examples:</strong> "contacts with healthcare", "find contacts with tech"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>📊 Contact Lists</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Show Lists:</strong> "show me my lists"</li>
                <li><strong>Display Lists:</strong> "display my lists"</li>
                <li><strong>List Lists:</strong> "list my lists"</li>
                <li><strong>See Lists:</strong> "see my lists"</li>
                <li><strong>What Lists:</strong> "what are my lists"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>🏢 Business Prospecting</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Find Businesses:</strong> "find financial services businesses in Mt. Lebanon"</li>
                <li><strong>Search Companies:</strong> "search for restaurants in Pittsburgh"</li>
                <li><strong>Prospect Companies:</strong> "prospect tech companies in Bethel Park"</li>
                <li><strong>Locate Businesses:</strong> "locate healthcare providers in Bridgeville"</li>
                <li><strong>Industry Search:</strong> "find dentists in Bridgeville"</li>
                <li><strong>Service Search:</strong> "search for auto repair shops in Mt. Lebanon"</li>
                <li><strong>Professional Services:</strong> "prospect law firms in Pittsburgh"</li>
                <li><strong>Retail Search:</strong> "find coffee shops in Bethel Park"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>📋 Task Creation</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Contact Tasks:</strong></li>
                <li>• "create a task for [contact] [date] regarding [description]"</li>
                <li>• "add task for [contact] [date] about [description]"</li>
                <li>• "schedule task for [contact] [date] to [description]"</li>
                <li><strong>Listing Tasks:</strong></li>
                <li>• "create a task for listing [address] [date] regarding [description]"</li>
                <li>• "add task for listing [address] [date] about [description]"</li>
                <li>• "task for listing [address] [date] [description]"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>📅 Dynamic Date Parsing</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Contact Examples:</strong></li>
                <li>• "create a task for Elodie Wren today about calling Martin"</li>
                <li>• "create task for John Smith tomorrow regarding follow up"</li>
                <li>• "add task for Jane Doe next Tuesday about client meeting"</li>
                <li><strong>Listing Examples:</strong></li>
                <li>• "create a task for listing 631 Iron City Drive tomorrow about taking photos"</li>
                <li>• "add task for listing 420 Main St next Tuesday to create marketing material"</li>
                <li>• "task for listing 123 Oak Avenue August 22nd about property showing"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>📝 Available Fields</h3>
              <p style={styles.fieldsText}>
                <strong>Contact fields:</strong> firstName, lastName, email, phone, company, address, businessSector, linkedin, notes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Business Results Modal */}
      {showBusinessResults && businessResults && (
        <div style={styles.modalOverlay} onClick={() => setShowBusinessResults(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>🏢 Business Prospecting Results</h2>
              <button 
                onClick={() => setShowBusinessResults(false)}
                style={styles.closeButton}
                className="close-button"
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.businessResultsHeader}>
                <p><strong>Location:</strong> {businessResults.searchLocation}</p>
                <p><strong>Businesses Found:</strong> {businessResults.businessesFound}</p>
                <p><strong>Search Terms:</strong> {businessResults.searchTerms?.join(', ')}</p>
              </div>
              
              <div style={styles.businessesContainer}>
                {businessResults.businesses.map((business, index) => (
                  <div key={business.place_id} style={styles.businessCard}>
                    <h4 style={styles.businessName}>{business.name}</h4>
                    <p style={styles.businessAddress}>{business.address}</p>
                    {business.phone && <p style={styles.businessPhone}>📞 {business.phone}</p>}
                    {business.website && (
                      <p style={styles.businessWebsite}>
                        🌐 <a href={business.website} target="_blank" rel="noopener noreferrer" style={styles.websiteLink}>
                          Visit Website
                        </a>
                      </p>
                    )}
                    {business.rating && <p style={styles.businessRating}>⭐ {business.rating}/5</p>}
                    <p style={styles.businessSearchTerm}>Found via: {business.search_term}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Filter Results Modal */}
      {showContactFilterResults && contactFilterResults && (
        <div style={styles.modalOverlay} onClick={() => setShowContactFilterResults(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>🔍 Contact Filter Results</h2>
              <button 
                onClick={() => setShowContactFilterResults(false)}
                style={styles.closeButton}
                className="close-button"
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.businessResultsHeader}>
                <p><strong>Search Criteria:</strong> {contactFilterResults.filterCriteria}</p>
                <p><strong>Search Field:</strong> {contactFilterResults.searchField}</p>
                <p><strong>Contacts Found:</strong> {contactFilterResults.totalFound}</p>
              </div>
              
              <div style={styles.businessesContainer}>
                {contactFilterResults.contacts.map((contact, index) => (
                  <button
                    key={contact.id}
                    className="contact-card-button"
                    style={styles.businessCard}
                    onClick={() => {
                      if (onShowContactDetail) onShowContactDetail(contact);
                    }}
                  >
                    <h4 style={styles.businessName}>{contact.firstName} {contact.lastName}</h4>
                    <p style={styles.businessAddress}>{contact.email}</p>
                    {contact.phone && <p style={styles.businessPhone}>📞 {contact.phone}</p>}
                    {contact.company && <p style={styles.businessAddress}>🏢 {contact.company}</p>}
                    {contact.businessSector && <p style={styles.businessSearchTerm}>💼 {contact.businessSector}</p>}
                    {contact.address && <p style={styles.businessAddress}>📍 {contact.address}</p>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    fontFamily: 'Georgia, serif',
  },
  responseArea: {
    minHeight: '200px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid rgba(0, 0, 0, 0.8)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '10px',
  },
  error: {
    color: '#d32f2f',
    backgroundColor: 'rgba(255, 235, 238, 0.8)',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 205, 210, 0.6)',
    fontSize: '14px',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
  },
  response: {
    color: '#2c2c2c',
    lineHeight: '1.6',
  },
  placeholder: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: '16px',
  },
  form: {
    marginTop: '20px',
  },
  inputContainer: {
    display: 'flex',
    gap: '12px',
  },
  textarea: {
    flex: 1,
    padding: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    resize: 'vertical',
    minHeight: '60px',
    fontFamily: 'Georgia, serif',
    fontSize: '14px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    transition: 'all 0.3s ease',
    color: '#2c2c2c',
  },
  button: {
    padding: '15px 25px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '400',
    fontFamily: 'Georgia, serif',
    alignSelf: 'flex-end',
    transition: 'all 0.3s ease',
    minWidth: '80px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  clearButton: {
    marginLeft: '10px',
    padding: '4px 8px',
    backgroundColor: 'rgba(211, 47, 47, 0.8)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'Georgia, serif',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
  },
  responseText: {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    fontFamily: 'Georgia, serif',
    margin: '10px 0 0 0',
    fontSize: '14px',
  },
  responseHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  actionBadge: {
    padding: '4px 8px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px',
  },
  messagesContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '10px 0',
  },
  message: {
    marginBottom: '20px',
    padding: '15px',
    borderRadius: '12px',
    maxWidth: '85%',
    wordWrap: 'break-word',
  },
  userMessage: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    marginLeft: 'auto',
    borderBottomRightRadius: '4px',
  },
  aiMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#2c2c2c',
    marginRight: 'auto',
    borderBottomLeftRadius: '4px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  messageSender: {
    fontSize: '14px',
    fontWeight: '600',
  },
  messageTime: {
    fontSize: '12px',
    opacity: '0.7',
    fontStyle: 'italic',
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
  aboutContainer: {
    marginBottom: '15px',
    display: 'flex',
    justifyContent: 'center',
  },
  aboutButton: {
    padding: '12px 24px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '400',
    fontFamily: 'Georgia, serif',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    paddingBottom: '15px',
  },
  modalTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '400',
    color: '#2c2c2c',
    fontFamily: 'Georgia, serif',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  modalBody: {
    color: '#2c2c2c',
    fontFamily: 'Georgia, serif',
    lineHeight: '1.6',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '25px 0 15px 0',
    color: '#2c2c2c',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    paddingBottom: '8px',
  },
  commandList: {
    margin: '15px 0',
    paddingLeft: '20px',
  },
  commandListItem: {
    margin: '8px 0',
    fontSize: '14px',
  },
  generalText: {
    fontSize: '14px',
    margin: '15px 0',
    color: '#666',
  },
  fieldsText: {
    fontSize: '14px',
    margin: '15px 0',
    color: '#666',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: '12px',
    borderRadius: '8px',
  },
  businessResultsHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  businessesContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    display: 'grid',
    gap: '15px',
  },
  businessCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    width: '100%',
    fontFamily: 'Georgia, serif',
  },
  businessName: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c2c2c',
  },
  businessAddress: {
    margin: '5px 0',
    fontSize: '14px',
    color: '#666',
  },
  businessPhone: {
    margin: '5px 0',
    fontSize: '14px',
    color: '#2c2c2c',
  },
  businessWebsite: {
    margin: '5px 0',
    fontSize: '14px',
  },
  websiteLink: {
    color: '#0066cc',
    textDecoration: 'none',
  },
  businessRating: {
    margin: '5px 0',
    fontSize: '14px',
    color: '#2c2c2c',
  },
  businessSearchTerm: {
    margin: '5px 0 0 0',
    fontSize: '12px',
    color: '#999',
    fontStyle: 'italic',
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:disabled {
    background-color: #cccccc !important;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  textarea:disabled {
    background-color: #f8f6f1;
    cursor: not-allowed;
  }
  
  textarea:focus {
    outline: none;
    border-color: #000000;
    box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
  }
  
  .chat-button:hover {
    background-color: #333333 !important;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0,0,0,0.2);
  }
  
  .chat-button:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }
  
  .about-button:hover {
    background-color: #333333 !important;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0,0,0,0.2);
  }
  
  .about-button:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }
  
  .close-button:hover {
    background-color: rgba(0, 0, 0, 0.1);
    color: #333;
  }
  
  /* Soft hover effect for contact cards */
  .contact-card-button:hover {
    background-color: rgba(255, 255, 255, 0.95) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    transform: translateY(-2px) !important;
  }
  
  .contact-card-button:active {
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
  }
  
  .command-list li {
    margin: 8px 0;
    font-size: 14px;
  }
`;
document.head.appendChild(styleSheet);

export default ChatBox; 