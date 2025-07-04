const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize Firebase Admin SDK
const { admin, db } = require('./firebase');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Martin Rebuild Backend is running!' });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input. Please provide a "message" field with a string value.' 
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.' 
      });
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated';

    // Save conversation to Firestore
    try {
      const conversationData = {
        message: message,
        reply: reply,
        timestamp: new Date(),
        model: 'gpt-4',
        tokens_used: completion.usage?.total_tokens || 0
      };

      await db.collection('conversations').add(conversationData);
      console.log('✅ Conversation saved to Firestore');
    } catch (firestoreError) {
      console.error('❌ Error saving to Firestore:', firestoreError);
      // Don't fail the request if Firestore save fails
    }

    res.json({ reply });

  } catch (error) {
    console.error('Error in /chat endpoint:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid OpenAI API key' });
    } else if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else if (error.status === 400) {
      return res.status(400).json({ error: 'Invalid request to OpenAI API' });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI Contact Action endpoint
app.post('/ai-contact-action', async (req, res) => {
  try {
    const { command } = req.body;

    // Validate input
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input. Please provide a "command" field with a string value.' 
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.' 
      });
    }

    // Step 1: Analyze user intent with GPT
    const intentPrompt = `
You are a CRM assistant that analyzes user requests and determines what they want to do with contact information.

Available actions:
- UPDATE_CONTACT: User wants to update existing contact information (edit, change, modify, set, update)
- CREATE_CONTACT: User wants to create a new contact
- DELETE_CONTACT: User wants to delete a contact or contact field
- SEARCH_CONTACT: User wants to find or search for contacts
- LIST_CONTACTS: User wants to see all contacts
- CREATE_LIST: User wants to create a contact list based on criteria
- GENERAL_QUERY: User is asking a general question about the CRM system

Available contact fields: firstName, lastName, email, phone, company, address, businessSector, linkedin, notes

IMPORTANT: For UPDATE_CONTACT, look for these patterns:
- "edit [contact] [field] to [value]"
- "change [contact] [field] to [value]"
- "update [contact] [field] to [value]"
- "set [contact] [field] to [value]"
- "modify [contact] [field] to [value]"
- "[contact] [field] should be [value]"
- "[contact] [field] is now [value]"

Contact identification can be by:
- Email address (contains @)
- Full name (firstName + lastName)
- Company name

Analyze the following user request and respond with ONLY a JSON object in this exact format:
{
  "intent": "UPDATE_CONTACT|CREATE_CONTACT|DELETE_CONTACT|SEARCH_CONTACT|LIST_CONTACTS|CREATE_LIST|GENERAL_QUERY",
  "confidence": 0.0-1.0,
  "extractedData": {
    "contactIdentifier": "email or firstName+lastName or company (if mentioned)",
    "action": "update|create|delete|search|list|create_list",
    "field": "fieldName (if mentioned)",
    "value": "new value (if mentioned)",
    "query": "search terms (if searching)",
    "listName": "suggested list name (if creating list)",
    "listCriteria": "description of what contacts to include in the list"
  },
  "userMessage": "A friendly response explaining what you understood they want to do"
}

If the request is unclear or doesn't match any action, set intent to GENERAL_QUERY and confidence to 0.0.

User request: "${command}"

Respond with ONLY the JSON object, no other text.`;

    // Call OpenAI API to analyze intent
    const intentCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: intentPrompt
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const intentResponse = intentCompletion.choices[0]?.message?.content || '';
    
    // Parse the intent analysis
    let intentAnalysis;
    try {
      intentAnalysis = JSON.parse(intentResponse);
      console.log('🔍 Intent Analysis:', intentAnalysis);
    } catch (parseError) {
      console.error('Failed to parse intent analysis:', intentResponse);
      return res.status(500).json({ 
        error: 'Failed to understand your request. Please try rephrasing.',
        details: 'Intent analysis parsing failed'
      });
    }

    // Check confidence level - be more lenient for update commands
    const minConfidence = intentAnalysis.intent === 'UPDATE_CONTACT' ? 0.2 : 0.3;
    if (intentAnalysis.confidence < minConfidence) {
      return res.status(400).json({ 
        error: 'I\'m not sure what you want to do. Please be more specific.',
        details: 'Low confidence in intent analysis',
        suggestion: intentAnalysis.userMessage,
        debug: intentAnalysis
      });
    }

    // Step 2: Execute action based on intent
    let result;
    
    switch (intentAnalysis.intent) {
      case 'UPDATE_CONTACT':
        result = await handleContactUpdate(intentAnalysis.extractedData, command);
        break;
        
      case 'CREATE_CONTACT':
        result = await handleContactCreation(intentAnalysis.extractedData, command);
        break;
        
      case 'DELETE_CONTACT':
        result = await handleContactDeletion(intentAnalysis.extractedData, command);
        break;
        
      case 'SEARCH_CONTACT':
        result = await handleContactSearch(intentAnalysis.extractedData, command);
        break;
        
      case 'LIST_CONTACTS':
        result = await handleContactListing(command);
        break;
        
      case 'CREATE_LIST':
        result = await handleListCreation(intentAnalysis.extractedData, command);
        break;
        
      case 'GENERAL_QUERY':
        result = await handleGeneralQuery(command);
        break;
        
      default:
        return res.status(400).json({ 
          error: 'Unknown action type. Please try rephrasing your request.',
          details: 'Invalid intent type'
        });
    }

    res.json(result);

  } catch (error) {
    console.error('Error in /ai-contact-action endpoint:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid OpenAI API key' });
    } else if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else if (error.status === 400) {
      return res.status(400).json({ error: 'Invalid request to OpenAI API' });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI List Creation endpoint
app.post('/ai-create-list', async (req, res) => {
  try {
    const { description } = req.body;

    // Validate input
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input. Please provide a "description" field with a string value.' 
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.' 
      });
    }

    // Step 1: Analyze the list creation request
    const analysisPrompt = `
You are a CRM assistant that helps create contact lists based on natural language descriptions.

Analyze the following request to create a contact list and respond with ONLY a JSON object in this exact format:
{
  "listName": "suggested list name",
  "criteria": {
    "businessSector": "sector filter (if mentioned)",
    "company": "company filter (if mentioned)",
    "hasLinkedIn": "true|false|null (if mentioned)",
    "hasNotes": "true|false|null (if mentioned)",
    "searchTerms": "general search terms to look for in any field"
  },
  "description": "human-readable description of what this list will contain"
}

Examples:
- "Create a list of tech companies" → {"listName": "Tech Companies", "criteria": {"businessSector": "tech"}, ...}
- "Show me contacts with LinkedIn profiles" → {"listName": "LinkedIn Contacts", "criteria": {"hasLinkedIn": "true"}, ...}
- "All contacts from Google" → {"listName": "Google Contacts", "criteria": {"company": "Google"}, ...}

User request: "${description}"

Respond with ONLY the JSON object, no other text.`;

    // Call OpenAI API to analyze the request
    const analysisCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const analysisResponse = analysisCompletion.choices[0]?.message?.content || '';
    
    // Parse the analysis
    let listAnalysis;
    try {
      listAnalysis = JSON.parse(analysisResponse);
    } catch (parseError) {
      console.error('Failed to parse list analysis:', analysisResponse);
      return res.status(500).json({ 
        error: 'Failed to understand your list request. Please try rephrasing.',
        details: 'List analysis parsing failed'
      });
    }

    // Step 2: Query contacts based on criteria
    const contacts = await queryContactsByCriteria(listAnalysis.criteria);

    // Step 3: Create the list
    const listData = {
      name: listAnalysis.listName,
      contactIds: contacts.map(c => c.id),
      createdAt: new Date(),
      createdBy: 'AI',
      description: listAnalysis.description,
      criteria: listAnalysis.criteria
    };

    const listRef = await db.collection('contactLists').add(listData);

    // Log the action
    await logListAction(description, 'create_list', listRef.id, listData);

    res.json({
      success: true,
      message: `Created list "${listAnalysis.listName}" with ${contacts.length} contacts`,
      listId: listRef.id,
      listName: listAnalysis.listName,
      contactCount: contacts.length,
      description: listAnalysis.description,
      contacts: contacts.map(c => ({
        id: c.id,
        name: `${c.data.firstName} ${c.data.lastName}`,
        email: c.data.email,
        company: c.data.company
      }))
    });

  } catch (error) {
    console.error('Error in /ai-create-list endpoint:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid OpenAI API key' });
    } else if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else if (error.status === 400) {
      return res.status(400).json({ error: 'Invalid request to OpenAI API' });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'An error occurred while creating your list',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to handle contact updates
async function handleContactUpdate(extractedData, originalCommand) {
  const { contactIdentifier, field, value } = extractedData;
  
  console.log('🔍 Contact Update Debug:', { contactIdentifier, field, value });
  
  if (!contactIdentifier || !field || !value) {
    return {
      success: false,
      error: 'Missing required information for contact update. Please specify the contact, field, and new value.',
      details: 'Incomplete update data',
      debug: { contactIdentifier, field, value }
    };
  }

  // Validate field
  const validFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'address', 'businessSector', 'linkedin', 'notes'];
  if (!validFields.includes(field)) {
    return {
      success: false,
      error: `Invalid field: ${field}. Valid fields are: ${validFields.join(', ')}`,
      details: 'Field validation failed'
    };
  }

  // Find the contact
  console.log('🔍 Searching for contact with identifier:', contactIdentifier);
  const contact = await findContact(contactIdentifier);
  
  if (!contact) {
    return {
      success: false,
      error: `Contact not found with identifier: "${contactIdentifier}". Please check the contact details and try again.`,
      details: `No contact found with identifier: ${contactIdentifier}`,
      suggestion: 'Try using the contact\'s email address, full name, or company name.'
    };
  }

  console.log('✅ Found contact:', contact.data.firstName, contact.data.lastName);

  // Update the contact
  try {
    await contact.ref.update({ [field]: value });
    console.log('✅ Contact updated successfully');
  } catch (updateError) {
    console.error('❌ Error updating contact:', updateError);
    return {
      success: false,
      error: 'Failed to update contact. Please try again.',
      details: 'Database update failed'
    };
  }

  // Log the action
  await logAction(originalCommand, 'update', contact.id, contact.data, field, value);

  return {
    success: true,
    message: `✅ Updated ${field} for ${contact.data.firstName} ${contact.data.lastName} to "${value}"`,
    action: 'update',
    contactId: contact.id,
    field: field,
    value: value,
    contactName: `${contact.data.firstName} ${contact.data.lastName}`
  };
}

// Helper function to handle contact creation
async function handleContactCreation(extractedData, originalCommand) {
  // For now, return a message that contact creation is not yet implemented
  // This can be expanded later
  return {
    success: false,
    error: 'Contact creation via AI commands is not yet implemented. Please use the contact form.',
    details: 'Feature not implemented'
  };
}

// Helper function to handle contact deletion
async function handleContactDeletion(extractedData, originalCommand) {
  const { contactIdentifier, field } = extractedData;
  
  if (!contactIdentifier) {
    return {
      success: false,
      error: 'Please specify which contact you want to delete.',
      details: 'Missing contact identifier'
    };
  }

  // Find the contact
  const contact = await findContact(contactIdentifier);
  if (!contact) {
    return {
      success: false,
      error: 'Contact not found. Please check the contact details and try again.',
      details: `No contact found with identifier: ${contactIdentifier}`
    };
  }

  if (field) {
    // Delete specific field
    await contact.ref.update({ [field]: admin.firestore.FieldValue.delete() });
    
    await logAction(originalCommand, 'delete_field', contact.id, contact.data, field, null);
    
    return {
      success: true,
      message: `Deleted ${field} for ${contact.data.firstName} ${contact.data.lastName}`,
      action: 'delete_field',
      contactId: contact.id,
      field: field
    };
  } else {
    // Delete entire contact
    await contact.ref.delete();
    
    await logAction(originalCommand, 'delete_contact', contact.id, contact.data, null, null);
    
    return {
      success: true,
      message: `Deleted contact: ${contact.data.firstName} ${contact.data.lastName}`,
      action: 'delete_contact',
      contactId: contact.id
    };
  }
}

// Helper function to handle contact search
async function handleContactSearch(extractedData, originalCommand) {
  const { query } = extractedData;
  
  if (!query) {
    return {
      success: false,
      error: 'Please specify what you are searching for.',
      details: 'Missing search query'
    };
  }

  // For now, return a message that search is not yet implemented
  // This can be expanded to actually search Firestore
  return {
    success: false,
    error: 'Contact search via AI commands is not yet implemented. Please use the search interface.',
    details: 'Feature not implemented'
  };
}

// Helper function to handle contact listing
async function handleContactListing(originalCommand) {
  // For now, return a message that listing is not yet implemented
  // This can be expanded to actually list contacts from Firestore
  return {
    success: false,
    error: 'Contact listing via AI commands is not yet implemented. Please use the contacts page.',
    details: 'Feature not implemented'
  };
}

// Helper function to handle general queries
async function handleGeneralQuery(originalCommand) {
  // Use the regular chat endpoint for general queries
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `You are a helpful CRM assistant. The user asked: "${originalCommand}". Please provide a helpful response about how to use the CRM system.`
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'I\'m not sure how to help with that.';

    return {
      success: true,
      message: reply,
      action: 'general_query',
      isChatResponse: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to process your question. Please try again.',
      details: 'General query processing failed'
    };
  }
}

// Helper function to find a contact
async function findContact(identifier) {
  const contactsRef = db.collection('contacts');
  let contactQuery;

  // Clean the identifier
  const cleanIdentifier = identifier.trim();

  if (cleanIdentifier.includes('@')) {
    // Search by email
    contactQuery = contactsRef.where('email', '==', cleanIdentifier);
  } else if (cleanIdentifier.includes(' ')) {
    // Search by firstName + lastName
    const nameParts = cleanIdentifier.split(' ');
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' '); // Handle multi-word last names
      contactQuery = contactsRef.where('firstName', '==', firstName).where('lastName', '==', lastName);
    } else {
      // Try searching by firstName only
      contactQuery = contactsRef.where('firstName', '==', cleanIdentifier);
    }
  } else {
    // Search by company or firstName
    // First try company
    let companySnapshot = await contactsRef.where('company', '==', cleanIdentifier).get();
    if (!companySnapshot.empty) {
      const contactDoc = companySnapshot.docs[0];
      return {
        id: contactDoc.id,
        ref: contactDoc.ref,
        data: contactDoc.data()
      };
    }
    
    // If no company match, try firstName
    contactQuery = contactsRef.where('firstName', '==', cleanIdentifier);
  }

  const contactSnapshot = await contactQuery.get();
  
  if (contactSnapshot.empty) {
    return null;
  }

  const contactDoc = contactSnapshot.docs[0];
  return {
    id: contactDoc.id,
    ref: contactDoc.ref,
    data: contactDoc.data()
  };
}

// Helper function to log actions
async function logAction(command, action, contactId, contactData, field, value) {
  try {
    await db.collection('ai_actions').add({
      command: command,
      action: action,
      contactId: contactId,
      contactName: contactData ? `${contactData.firstName} ${contactData.lastName}` : 'Unknown',
      field: field,
      value: value,
      timestamp: new Date(),
      success: true
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

// Helper function to handle list creation
async function handleListCreation(extractedData, originalCommand) {
  const { listName, listCriteria } = extractedData;
  
  if (!listName || !listCriteria) {
    return {
      success: false,
      error: 'Please specify what kind of list you want to create.',
      details: 'Missing list name or criteria'
    };
  }

  try {
    // Query contacts based on criteria
    const contacts = await queryContactsByCriteria({ searchTerms: listCriteria });

    if (contacts.length === 0) {
      return {
        success: false,
        error: 'No contacts found matching your criteria.',
        details: 'No contacts match the specified criteria'
      };
    }

    // Create the list
    const listData = {
      name: listName,
      contactIds: contacts.map(c => c.id),
      createdAt: new Date(),
      createdBy: 'AI',
      description: `AI-generated list: ${listCriteria}`,
      criteria: { searchTerms: listCriteria }
    };

    const listRef = await db.collection('contactLists').add(listData);

    // Log the action
    await logListAction(originalCommand, 'create_list', listRef.id, listData);

    return {
      success: true,
      message: `Created list "${listName}" with ${contacts.length} contacts`,
      action: 'create_list',
      listId: listRef.id,
      listName: listName,
      contactCount: contacts.length,
      contacts: contacts.map(c => ({
        id: c.id,
        name: `${c.data.firstName} ${c.data.lastName}`,
        email: c.data.email,
        company: c.data.company
      }))
    };

  } catch (error) {
    console.error('Error creating list:', error);
    return {
      success: false,
      error: 'Failed to create the list. Please try again.',
      details: 'List creation failed'
    };
  }
}

// Helper function to query contacts by criteria
async function queryContactsByCriteria(criteria) {
  const contactsRef = db.collection('contacts');
  let query = contactsRef;

  // Apply filters based on criteria
  if (criteria.businessSector) {
    query = query.where('businessSector', '==', criteria.businessSector);
  }

  if (criteria.company) {
    query = query.where('company', '==', criteria.company);
  }

  if (criteria.hasLinkedIn === 'true') {
    query = query.where('linkedin', '!=', '');
  } else if (criteria.hasLinkedIn === 'false') {
    query = query.where('linkedin', '==', '');
  }

  if (criteria.hasNotes === 'true') {
    query = query.where('notes', '!=', '');
  } else if (criteria.hasNotes === 'false') {
    query = query.where('notes', '==', '');
  }

  // Get all contacts (we'll filter by search terms in memory if needed)
  const snapshot = await query.get();
  let contacts = snapshot.docs.map(doc => ({
    id: doc.id,
    data: doc.data()
  }));

  // Apply search terms filter if specified
  if (criteria.searchTerms) {
    const searchTerms = criteria.searchTerms.toLowerCase();
    contacts = contacts.filter(contact => {
      const data = contact.data;
      return (
        (data.firstName && data.firstName.toLowerCase().includes(searchTerms)) ||
        (data.lastName && data.lastName.toLowerCase().includes(searchTerms)) ||
        (data.email && data.email.toLowerCase().includes(searchTerms)) ||
        (data.company && data.company.toLowerCase().includes(searchTerms)) ||
        (data.businessSector && data.businessSector.toLowerCase().includes(searchTerms)) ||
        (data.notes && data.notes.toLowerCase().includes(searchTerms))
      );
    });
  }

  return contacts;
}

// Helper function to log list actions
async function logListAction(command, action, listId, listData) {
  try {
    await db.collection('ai_list_actions').add({
      command: command,
      action: action,
      listId: listId,
      listName: listData.name,
      contactCount: listData.contactIds.length,
      timestamp: new Date(),
      success: true
    });
  } catch (error) {
    console.error('Failed to log list action:', error);
  }
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Chat endpoint available at http://localhost:${PORT}/chat`);
  console.log(`🤖 AI Contact Action endpoint available at http://localhost:${PORT}/ai-contact-action`);
  console.log(`📋 AI List Creation endpoint available at http://localhost:${PORT}/ai-create-list`);
  console.log(`🔑 Make sure to set your OpenAI API key in the .env file`);
  console.log(`🔥 Firebase Admin SDK ready for Firestore operations`);
}); 