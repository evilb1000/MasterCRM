import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ENDPOINTS } from '../config.js';
import { handleAIContactAction, isContactActionCommand, processContactAction, isListCreationCommand, processListCreation } from '../services/aiContactActions';

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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const isList = isListCreationCommand(currentMessage);
      const isContact = isContactActionCommand(currentMessage);
      console.log('🔍 Command Analysis:', {
        message: currentMessage,
        isListCreation: isList,
        isContactAction: isContact
      });
      
      // Additional debugging for activity patterns
      if (currentMessage.toLowerCase().includes('log') || currentMessage.toLowerCase().includes('call')) {
        console.log('🔍 Activity pattern detected in message:', currentMessage);
      }

      // Check if this is a list creation command
      if (isList) {
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
              
              <h3 style={styles.sectionTitle}>💬 General Chat</h3>
              <p style={styles.generalText}>
                For any other questions or general conversation, simply type your message and the AI will respond naturally.
              </p>
              
              <h3 style={styles.sectionTitle}>📝 Available Fields</h3>
              <p style={styles.fieldsText}>
                <strong>Contact fields:</strong> firstName, lastName, email, phone, company, address, businessSector, linkedin, notes
              </p>
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