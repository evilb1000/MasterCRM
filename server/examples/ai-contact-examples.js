// Frontend Examples for AI Contact Action Endpoint
// Apply these examples to your React ChatBox.jsx or similar component

const BACKEND_URL = 'http://localhost:3001'; // Update with your backend URL

// Example 1: Basic function to call the AI contact action endpoint
async function handleAIContactAction(command) {
  try {
    const response = await fetch(`${BACKEND_URL}/ai-contact-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to process command');
    }

    return result;
  } catch (error) {
    console.error('Error processing AI command:', error);
    throw error;
  }
}

// Example 2: React component integration
function ChatBoxWithAIActions() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      // Check if this looks like a contact action command
      const isContactAction = /(update|change|set|delete|remove).*(phone|email|address|company|name)/i.test(userMessage);
      
      if (isContactAction) {
        // Use AI contact action endpoint
        const result = await handleAIContactAction(userMessage);
        
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          content: `✅ ${result.message}`,
          action: result
        }]);
      } else {
        // Use regular chat endpoint
        const response = await fetch(`${BACKEND_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage }),
        });
        
        const chatResult = await response.json();
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          content: chatResult.reply 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="message assistant">Processing...</div>}
      </div>
      
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message or contact command..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}

// Example 3: Direct contact action calls (for specific use cases)
const contactActionExamples = {
  // Update phone number
  updatePhone: async (contactName, newPhone) => {
    return await handleAIContactAction(`Update ${contactName}'s phone number to ${newPhone}`);
  },

  // Update email
  updateEmail: async (contactName, newEmail) => {
    return await handleAIContactAction(`Update ${contactName}'s email to ${newEmail}`);
  },

  // Update company
  updateCompany: async (contactName, newCompany) => {
    return await handleAIContactAction(`Update ${contactName}'s company to ${newCompany}`);
  },

  // Delete contact
  deleteContact: async (contactName) => {
    return await handleAIContactAction(`Delete contact ${contactName}`);
  },

  // Update address
  updateAddress: async (contactName, newAddress) => {
    return await handleAIContactAction(`Update ${contactName}'s address to ${newAddress}`);
  }
};

// Example 4: Usage examples
async function exampleUsage() {
  try {
    // Update John Smith's phone number
    const result1 = await contactActionExamples.updatePhone('John Smith', '555-1234');
    console.log('Phone updated:', result1);

    // Update Jane Doe's email
    const result2 = await contactActionExamples.updateEmail('Jane Doe', 'jane.doe@example.com');
    console.log('Email updated:', result2);

    // Update company for a contact
    const result3 = await contactActionExamples.updateCompany('John Smith', 'Acme Corp');
    console.log('Company updated:', result3);

  } catch (error) {
    console.error('Error in examples:', error);
  }
}

// Example 5: Error handling and validation
async function safeContactAction(command) {
  try {
    // Basic validation
    if (!command || command.length < 10) {
      throw new Error('Command too short. Please be more specific.');
    }

    const result = await handleAIContactAction(command);
    
    // Check if action was successful
    if (result.success) {
      // Optionally refresh your contact list or update UI
      console.log('Action completed successfully:', result.message);
      return result;
    } else {
      throw new Error(result.error || 'Action failed');
    }
  } catch (error) {
    console.error('Contact action failed:', error);
    // Handle error in UI (show toast, alert, etc.)
    throw error;
  }
}

// Export for use in other files
export {
  handleAIContactAction,
  ChatBoxWithAIActions,
  contactActionExamples,
  safeContactAction
}; 