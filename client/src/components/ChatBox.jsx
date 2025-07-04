import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastActionType, setLastActionType] = useState('');

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
      setResponse('');
      setLastActionType('show_lists');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');
    setLastActionType('');

    try {
      let responseText = '';
      let actionType = '';

      // Check if this is a list creation command
      if (isListCreationCommand(message)) {
        // Use AI List Creation endpoint
        const result = await processListCreation(message);
        
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
      else if (isContactActionCommand(message)) {
        // Use AI Contact Actions endpoint
        const result = await processContactAction(message);
        
        if (result.success) {
          responseText = result.message;
          actionType = 'contact_action';
        } else {
          throw new Error(result.error);
        }
      } else {
        // Use regular chat endpoint
        const result = await axios.post('https://us-central1-lod-crm-systems.cloudfunctions.net/chat', {
          message: message
        });
        
        // Better response handling to prevent crashes
        if (result.data) {
          if (typeof result.data === 'string') {
            responseText = result.data;
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
      
      setResponse(responseText);
      setLastActionType(actionType);
      setMessage('');
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

  return (
    <div style={styles.container}>
      {/* Response Display Area */}
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
        
        {response && !loading && (
          <div style={styles.response}>
            <div style={styles.responseHeader}>
              <strong>
                {lastActionType === 'contact_action' ? 'Contact Action' : lastActionType === 'list_creation' ? 'List Creation' : lastActionType === 'show_lists' ? 'Contact Lists' : 'Response'}:
              </strong>
              {lastActionType === 'contact_action' && (
                <span style={styles.actionBadge}>AI Contact Management</span>
              )}
              {lastActionType === 'list_creation' && (
                <span style={styles.actionBadge}>AI List Creation</span>
              )}
            </div>
            <pre style={styles.responseText}>{response}</pre>
          </div>
        )}
        
        {!response && !loading && !error && (
          <div style={styles.placeholder}>
            Your conversation will appear here...
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputContainer}>
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
      </form>
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
`;
document.head.appendChild(styleSheet);

export default ChatBox; 