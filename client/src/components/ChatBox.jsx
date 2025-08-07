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

const ChatBox = ({ onShowLists }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastActionType, setLastActionType] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [showBusinessResults, setShowBusinessResults] = useState(false);
  const [businessResults, setBusinessResults] = useState(null);
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
      const isList = isListCreationCommand(currentMessage);
      const isContact = isContactActionCommand(currentMessage);
      const isBusinessProspecting = isBusinessProspectingCommand(currentMessage);
      const isTaskCreation = isTaskCreationCommand(currentMessage);
      console.log('🔍 Command Analysis:', {
        message: currentMessage,
        isCombinedListCreationAndAttachment: isCombinedList,
        isCombinedActivityCreationAndListingAttachment: isCombinedActivity,
        isListCreation: isList,
        isContactAction: isContact,
        isBusinessProspecting: isBusinessProspecting,
        isTaskCreation: isTaskCreation
      });
      
      // Additional debugging for activity patterns
      if (currentMessage.toLowerCase().includes('log') || currentMessage.toLowerCase().includes('call')) {
        console.log('🔍 Activity pattern detected in message:', currentMessage);
      }

      // Check if this is a combined activity creation and listing attachment command (highest priority)
      if (isCombinedActivity) {
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
      // Check if this is a list creation command
      else if (isList) {
        console.log('📋 Routing to List Creation endpoint');
        // Use AI List Creation endpoint
        const result = await processListCreation(currentMessage);
        
        if (result.success) {
          responseText = `${result.message}\n\nList Details:\n- Name: ${result.listName}\n- Contacts: ${result.contactCount}\n- ID: ${result.listId}`;
          
          // Add contact details if available
          if (result.contacts && result.contacts.length > 0) {
            responseText += '\n\nContacts in list:\n';
            result.contacts.forEach((contact, index) => {
              responseText += `${index + 1}. ${contact.name} (${contact.email || 'No email'}) - ${contact.company || 'No company'}\n`;
            });
          }
          
          actionType = 'list_creation';
        } else {
          throw new Error(result.error);
        }
      }
      // Check if this is a business prospecting command
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
      // Check if this is a task creation command
      else if (isTaskCreation) {
        console.log('📋 Routing to Task Creation endpoint');
        const result = await processTaskCreation(currentMessage);
        
        if (result.success) {
          responseText = `${result.message}\n\nTask Details:\n- Title: ${result.task.title}\n- Description: ${result.task.description}\n- Due Date: ${result.task.dueDate}\n- Priority: ${result.task.priority}\n- Status: ${result.task.status}\n- Task ID: ${result.taskId}\n\nContact: ${result.contact.firstName} ${result.contact.lastName} (${result.contact.email})`;
          actionType = 'task_creation';
          
          // Emit a custom event to refresh tasks
          console.log('🎯 AI Task created, dispatching refresh event');
          window.dispatchEvent(new CustomEvent('aiTaskCreated', {
            detail: {
              taskId: result.taskId,
              contactId: result.contact.id,
              taskTitle: result.task.title,
              dueDate: result.task.dueDate
            }
          }));
        } else {
          throw new Error(result.error);
        }
      }
      // Check if this is a contact action command
      else if (isContact) {
        console.log('👤 Routing to Contact Action endpoint');
        // Use AI Contact Actions endpoint
        const result = await processContactAction(currentMessage);
        
        if (result.success) {
          responseText = result.message;
          actionType = 'contact_action';
          
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
          } else if (result.action === 'create_activity') {
            console.log('🎯 AI Activity created, dispatching refresh event (direct action)');
            window.dispatchEvent(new CustomEvent('aiActivityCreated', {
              detail: {
                contactId: result.contactId,
                activityType: result.activityType,
                activityId: result.activityId
              }
            }));
          }
        } else {
          throw new Error(result.error);
        }
      } else {
        // Check if this is a CRM-related query before routing to general chat
        const isCRMRelated = isCRMQuery(currentMessage);
        if (!isCRMRelated) {
          console.log('🚫 Non-CRM query detected, returning CRM-only message');
          responseText = "I am only trained to provide assistance within the confines of the CRM system. Please ask me about contact management, activity logging, list creation, or other CRM-related tasks.";
          actionType = 'crm_only';
        } else {
          console.log('💬 Routing to General Chat endpoint');
          // Use regular chat endpoint
          const result = await axios.post(ENDPOINTS.CHAT, {
            message: currentMessage
          });
        
          // Better response handling to prevent crashes
          if (result.data) {
            if (typeof result.data === 'string') {
              responseText = result.data;
            } else if (result.data.reply) {
              responseText = result.data.reply;
            } else if (result.data.response) {
              responseText = result.data.response;
            } else if (result.data.message) {
              responseText = result.data.message;
            } else if (result.data.text) {
              responseText = result.data.text;
            } else {
              // Fallback: stringify the entire response for debugging
              responseText = JSON.stringify(result.data, null, 2);
            }
          }
          actionType = 'chat';
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
                     msg.actionType === 'show_lists' ? 'Contact Lists' : 'AI Action'}
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
              
              <h3 style={styles.sectionTitle}>🔍 Contact Search</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Find Contacts:</strong> "find all [criteria]"</li>
                <li><strong>Show Contacts:</strong> "show me [criteria]"</li>
                <li><strong>List Contacts:</strong> "list of [criteria]"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>📊 Contact Lists</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Show Lists:</strong> "show me my lists"</li>
                <li><strong>Display Lists:</strong> "display my lists"</li>
                <li><strong>List Lists:</strong> "list my lists"</li>
              </ul>
              
              <h3 style={styles.sectionTitle}>🏢 Business Prospecting</h3>
              <ul style={styles.commandList} className="command-list">
                <li><strong>Find Businesses:</strong> "find financial services businesses in Mt. Lebanon"</li>
                <li><strong>Search Companies:</strong> "search for restaurants in Pittsburgh"</li>
                <li><strong>Prospect Companies:</strong> "prospect tech companies in Bethel Park"</li>
                <li><strong>Locate Businesses:</strong> "locate healthcare providers in Bridgeville"</li>
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
  
  .command-list li {
    margin: 8px 0;
    font-size: 14px;
  }
`;
document.head.appendChild(styleSheet);

export default ChatBox; 