const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  console.error('🚨 Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  console.error('🚨 Stack trace:', reason?.stack);
});

// Initialize Firebase Admin SDK
console.log('🔧 Initializing Firebase Admin SDK...');
const { admin, db } = require('./firebase');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
console.log('🔧 Initializing OpenAI client...');

// Get OpenAI API key from environment or Firebase Functions config
let openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey && process.env.FIREBASE_FUNCTIONS) {
  try {
    const functions = require('firebase-functions');
    openaiApiKey = functions.config().openai?.api_key;
    console.log('🔧 Using Firebase Functions config for API key');
  } catch (error) {
    console.error('Failed to get Firebase Functions config:', error);
  }
}

console.log('🔧 API Key length:', openaiApiKey ? openaiApiKey.length : 0);
const openai = new OpenAI({
  apiKey: openaiApiKey,
});
console.log('🔧 OpenAI client initialized');

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to check if a query is CRM-related
function isCRMQuery(message) {
  const lowerMessage = message.toLowerCase();
  
  // CRM-related keywords and patterns
  const crmKeywords = [
    // Contact management
    'contact', 'contacts', 'person', 'people', 'client', 'customer', 'lead',
    'update', 'edit', 'change', 'modify', 'set', 'add', 'delete', 'remove',
    'name', 'email', 'phone', 'company', 'address', 'business', 'sector',
    'linkedin', 'notes', 'note',
    
    // Activity logging
    'activity', 'activities', 'log', 'logged', 'call', 'email', 'meeting',
    'showing', 'appointment', 'discussed', 'discussion', 'talked', 'spoke',
    
    // List management
    'list', 'lists', 'create', 'make', 'build', 'generate', 'show', 'display',
    'find', 'search', 'filter', 'criteria', 'group', 'category',
    
    // CRM system
    'crm', 'system', 'help', 'assist', 'how to', 'what can', 'guide',
    'manage', 'organize', 'track', 'record', 'database',
    
    // Common CRM phrases
    'how do i', 'can you help', 'i need to', 'i want to', 'please help',
    'show me', 'tell me about', 'explain', 'what is', 'where is'
  ];
  
  // Check if message contains any CRM keywords
  const hasCRMKeyword = crmKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Additional patterns that indicate CRM intent
  const crmPatterns = [
    /\b(update|edit|change|modify|set)\s+\w+/i,
    /\b(add|create|make|build|generate)\s+\w+/i,
    /\b(log|record|track)\s+\w+/i,
    /\b(find|search|show|display)\s+\w+/i,
    /\b(contact|person|client|customer)\s+\w+/i,
    /\b(activity|call|email|meeting|showing)\s+\w+/i,
    /\b(list|group|category)\s+\w+/i,
    /\?$/, // Questions
    /\b(how|what|where|when|why|can|could|would|should)\b/i // Question words
  ];
  
  const hasCRMPattern = crmPatterns.some(pattern => pattern.test(message));
  
  // Return true if either condition is met
  return hasCRMKeyword || hasCRMPattern;
}

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
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file or Firebase Functions config.' 
      });
    }

    // Check if message is CRM-related
    const isCRMRelated = isCRMQuery(message);
    if (!isCRMRelated) {
      return res.json({ 
        reply: "I am only trained to provide assistance within the confines of the CRM system. Please ask me about contact management, activity logging, list creation, or other CRM-related tasks."
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
    
    console.log('🤖 AI Contact Action Request:', { command });

    // Validate input
    if (!command || typeof command !== 'string') {
      console.log('❌ Invalid input received:', { command });
      return res.status(400).json({ 
        error: 'Invalid input. Please provide a "command" field with a string value.' 
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('❌ OpenAI API key not configured');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.' 
      });
    }

    // Step 1: Analyze user intent with GPT
    const intentPrompt = `
You are a CRM assistant that analyzes user requests and determines what they want to do with contact information.

Available actions:
- UPDATE_CONTACT: User wants to update existing contact information (edit, change, modify, set, update)
- ADD_NOTE: User wants to add a note to an existing contact (add note, append note, include note)
- CREATE_ACTIVITY: User wants to log an activity for a contact (called, emailed, met with, texted, showed property to)
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

IMPORTANT: For ADD_NOTE, look for these patterns:
- "add note to [contact]: [note content]"
- "add note for [contact]: [note content]"
- "append note to [contact]: [note content]"
- "include note for [contact]: [note content]"
- "add [note content] to [contact]'s notes"
- "[contact] note: [note content]"
- "add note: [note content] for [contact]"
- "note for [contact]: [note content]"
- "add [note content] to [contact]"
- "[contact] - [note content]"

IMPORTANT: For CREATE_ACTIVITY, look for these patterns:
- "called [contact]" or "called [contact] about [description]"
- "emailed [contact]" or "emailed [contact] about [description]"
- "met with [contact]" or "met with [contact] about [description]"
- "texted [contact]" or "texted [contact] about [description]"
- "showed property to [contact]" or "showed [contact] the property"
- "followed up with [contact]" or "follow up with [contact]"
- "[contact] called me" or "[contact] emailed me"
- "had a [type] with [contact]" where type is call/email/meeting/text/showing

IMPORTANT: For CREATE_CONTACT, look for these patterns:
- "create contact" or "create a contact" or "create new contact"
- "add contact" or "add a contact" or "add new contact"
- "new contact" or "create contact for [name]"
- "add contact for [name]" or "create contact [name]"
- "new contact [name] [email] [phone] [company]"
- "create contact: [name], [email], [phone], [company]"

Contact identification can be by:
- Email address (contains @)
- Full name (firstName + lastName)
- Company name

Analyze the following user request and respond with ONLY a JSON object in this exact format:
{
  "intent": "UPDATE_CONTACT|ADD_NOTE|CREATE_ACTIVITY|CREATE_CONTACT|DELETE_CONTACT|SEARCH_CONTACT|LIST_CONTACTS|CREATE_LIST|GENERAL_QUERY",
  "confidence": 0.0-1.0,
  "extractedData": {
    "contactIdentifier": "email or firstName+lastName or company (if mentioned)",
    "action": "update|add_note|create_activity|create|delete|search|list|create_list",
    "field": "fieldName (if mentioned)",
    "value": "new value (if mentioned)",
    "firstName": "first name (if creating contact)",
    "lastName": "last name (if creating contact)",
    "email": "email address (if creating contact)",
    "phone": "phone number (if creating contact)",
    "company": "company name (if creating contact)",
    "address": "address (if creating contact)",
    "businessSector": "business sector (if creating contact)",
    "linkedin": "linkedin profile (if creating contact)",
    "notes": "notes (if creating contact)",
    "activityType": "call|email|meeting|text|showing|follow_up|other (if creating activity)",
    "activityDescription": "description of the activity (if creating activity)",
    "query": "search terms (if searching)",
    "listName": "suggested list name (if creating list)",
    "listCriteria": "description of what contacts to include in the list"
  },
  "userMessage": "A friendly response explaining what you understood they want to do"
}

If the request is unclear or doesn't match any action, set intent to GENERAL_QUERY and confidence to 0.0.

Examples of ADD_NOTE commands:
- "add note to John Smith: He prefers email communication"
- "add note for john@example.com: Great follow-up candidate"
- "John Smith note: Interested in new product line"
- "add note: Loves coffee meetings for Elodie Wren"

Examples of CREATE_CONTACT commands:
- "create contact for John Smith"
- "add contact john@example.com"
- "new contact: John Smith, john@example.com, 555-1234, Acme Corp"
- "create contact John Smith with email john@example.com and phone 555-1234"
- "add new contact: Jane Doe from Tech Solutions"

User request: "${command}"

Respond with ONLY the JSON object, no other text.`;

    // Call OpenAI API to analyze intent
    console.log('🔍 Sending intent analysis request to OpenAI...');
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
    console.log('🔍 Raw OpenAI Intent Response:', intentResponse);
    
    // Parse the intent analysis
    let intentAnalysis;
    try {
      intentAnalysis = JSON.parse(intentResponse);
      console.log('🔍 Parsed Intent Analysis:', JSON.stringify(intentAnalysis, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse intent analysis:', intentResponse);
      console.error('❌ Parse error:', parseError.message);
      return res.status(500).json({ 
        error: 'Failed to understand your request. Please try rephrasing.',
        details: 'Intent analysis parsing failed'
      });
    }

    // Check confidence level - be more lenient for update and note commands
    const minConfidence = (intentAnalysis.intent === 'UPDATE_CONTACT' || intentAnalysis.intent === 'ADD_NOTE') ? 0.2 : 0.3;
    console.log(`🔍 Confidence check: ${intentAnalysis.confidence} >= ${minConfidence} (${intentAnalysis.confidence >= minConfidence ? 'PASS' : 'FAIL'})`);
    
    if (intentAnalysis.confidence < minConfidence) {
      console.log('❌ Low confidence in intent analysis');
      return res.status(400).json({ 
        error: 'I\'m not sure what you want to do. Please be more specific.',
        details: 'Low confidence in intent analysis',
        suggestion: intentAnalysis.userMessage,
        debug: intentAnalysis
      });
    }

    // Step 2: Execute action based on intent
    console.log(`🔍 Executing action: ${intentAnalysis.intent}`);
    let result;
    
    switch (intentAnalysis.intent) {
      case 'UPDATE_CONTACT':
        console.log('🔧 Handling UPDATE_CONTACT...');
        result = await handleContactUpdate(intentAnalysis.extractedData, command);
        break;
        
      case 'ADD_NOTE':
        console.log('🔧 Handling ADD_NOTE...');
        result = await handleAddNote(intentAnalysis.extractedData, command);
        break;
        
      case 'CREATE_ACTIVITY':
        console.log('🔧 Handling CREATE_ACTIVITY...');
        result = await handleCreateActivity(intentAnalysis.extractedData, command);
        break;
        
      case 'CREATE_CONTACT':
        console.log('🔧 Handling CREATE_CONTACT...');
        result = await handleContactCreation(intentAnalysis.extractedData, command);
        break;
        
      case 'DELETE_CONTACT':
        console.log('🔧 Handling DELETE_CONTACT...');
        result = await handleContactDeletion(intentAnalysis.extractedData, command);
        break;
        
      case 'SEARCH_CONTACT':
        console.log('🔧 Handling SEARCH_CONTACT...');
        result = await handleContactSearch(intentAnalysis.extractedData, command);
        break;
        
      case 'LIST_CONTACTS':
        console.log('🔧 Handling LIST_CONTACTS...');
        result = await handleContactListing(command);
        break;
        
      case 'CREATE_LIST':
        console.log('🔧 Handling CREATE_LIST...');
        result = await handleListCreation(intentAnalysis.extractedData, command);
        break;
        
      case 'GENERAL_QUERY':
        console.log('🔧 Handling GENERAL_QUERY...');
        result = await handleGeneralQuery(command);
        break;
        
      default:
        console.log(`❌ Unknown intent type: ${intentAnalysis.intent}`);
        return res.status(400).json({ 
          error: 'Unknown action type. Please try rephrasing your request.',
          details: 'Invalid intent type'
        });
    }

    console.log('✅ Final result:', JSON.stringify(result, null, 2));
    res.json(result);

  } catch (error) {
    console.error('❌ Error in /ai-contact-action endpoint:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      console.log('❌ OpenAI API key error');
      return res.status(401).json({ error: 'Invalid OpenAI API key' });
    } else if (error.status === 429) {
      console.log('❌ OpenAI rate limit error');
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else if (error.status === 400) {
      console.log('❌ OpenAI invalid request error');
      return res.status(400).json({ error: 'Invalid request to OpenAI API' });
    }
    
    // Generic error response
    console.log('❌ Generic error response');
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

// Helper function to handle adding notes to contacts
async function handleAddNote(extractedData, originalCommand) {
  const { contactIdentifier, value } = extractedData;
  
  console.log('🔍 Add Note Debug:', { contactIdentifier, value });
  
  if (!contactIdentifier || !value) {
    return {
      success: false,
      error: 'Missing required information for adding note. Please specify the contact and the note content.',
      details: 'Incomplete note data',
      debug: { contactIdentifier, value }
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

  // Get current notes and append new note
  const currentNotes = contact.data.notes || '';
  const newNote = value.trim();
  
  // Combine notes with proper formatting
  let updatedNotes;
  if (currentNotes) {
    // If there are existing notes, add a line break and the new note
    updatedNotes = `${currentNotes}\n${newNote}`;
  } else {
    // If no existing notes, just use the new note
    updatedNotes = newNote;
  }

  // Update the contact with the combined notes
  try {
    await contact.ref.update({ notes: updatedNotes });
    console.log('✅ Note added successfully');
  } catch (updateError) {
    console.error('❌ Error adding note:', updateError);
    return {
      success: false,
      error: 'Failed to add note. Please try again.',
      details: 'Database update failed'
    };
  }

  // Log the action
  await logAction(originalCommand, 'add_note', contact.id, contact.data, 'notes', newNote);

  return {
    success: true,
    message: `✅ Added note to ${contact.data.firstName} ${contact.data.lastName}: "${newNote}"`,
    action: 'add_note',
    contactId: contact.id,
    field: 'notes',
    value: newNote,
    contactName: `${contact.data.firstName} ${contact.data.lastName}`,
    totalNotes: updatedNotes
  };
}

// Helper function to handle activity creation
async function handleCreateActivity(extractedData, originalCommand) {
  const { contactIdentifier, activityType, activityDescription } = extractedData;
  
  if (!contactIdentifier) {
    return {
      success: false,
      error: 'Please specify which contact this activity is for.',
      details: 'Missing contact identifier'
    };
  }

  if (!activityType) {
    return {
      success: false,
      error: 'Please specify the type of activity (call, email, meeting, etc.).',
      details: 'Missing activity type'
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

  // Create activity data
  const activityData = {
    contactId: contact.id,
    type: activityType,
    description: activityDescription || `Activity with ${contact.data.firstName} ${contact.data.lastName}`,
    date: new Date(),
    duration: null,
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Save to Firestore
  try {
    const activityRef = await db.collection('activities').add(activityData);
    console.log('✅ Activity created successfully:', {
      activityId: activityRef.id,
      contactId: contact.id,
      type: activityType,
      description: activityData.description
    });

    // Log the action
    await logAction(originalCommand, 'create_activity', contact.id, contact.data, 'activity', activityType);

    return {
      success: true,
      message: `✅ Logged ${activityType} activity for ${contact.data.firstName} ${contact.data.lastName}`,
      action: 'create_activity',
      contactId: contact.id,
      activityId: activityRef.id,
      activityType: activityType,
      description: activityData.description,
      contactName: `${contact.data.firstName} ${contact.data.lastName}`
    };

  } catch (error) {
    console.error('❌ Error creating activity:', error);
    return {
      success: false,
      error: 'Failed to create activity. Please try again.',
      details: 'Database operation failed'
    };
  }
}

// Helper function to handle contact creation
async function handleContactCreation(extractedData, originalCommand) {
  console.log('🔍 Contact Creation Debug:', extractedData);
  
  // Extract contact information from the command
  const { contactIdentifier, firstName, lastName, email, phone, company, address, businessSector, linkedin, notes } = extractedData;
  
  // Check if we have at least a name or email to create a contact
  if (!contactIdentifier && !firstName && !lastName && !email) {
    return {
      success: false,
      error: 'Please provide at least a name or email address to create a contact.',
      details: 'Missing required contact information',
      suggestion: 'Try: "create contact for John Smith" or "add contact john@example.com"'
    };
  }

  // Parse contact identifier if provided (could be full name or email)
  let parsedFirstName = firstName;
  let parsedLastName = lastName;
  let parsedEmail = email;

  if (contactIdentifier) {
    if (contactIdentifier.includes('@')) {
      // It's an email address
      parsedEmail = contactIdentifier;
    } else if (contactIdentifier.includes(' ')) {
      // It's a full name, split into first and last
      const nameParts = contactIdentifier.split(' ');
      parsedFirstName = nameParts[0];
      parsedLastName = nameParts.slice(1).join(' ');
    } else {
      // Single word, treat as first name
      parsedFirstName = contactIdentifier;
    }
  }

  // Validate required fields
  if (!parsedFirstName && !parsedEmail) {
    return {
      success: false,
      error: 'Please provide at least a first name or email address.',
      details: 'Missing required contact information'
    };
  }

  // Check if contact already exists (by email if provided)
  if (parsedEmail) {
    const existingContact = await findContact(parsedEmail);
    if (existingContact) {
      return {
        success: false,
        error: `A contact with email "${parsedEmail}" already exists.`,
        details: 'Contact already exists',
        suggestion: 'Try updating the existing contact instead.'
      };
    }
  }

  // Prepare contact data
  const contactData = {
    firstName: parsedFirstName || '',
    lastName: parsedLastName || '',
    email: parsedEmail || '',
    phone: phone || '',
    company: company || '',
    address: address || '',
    businessSector: businessSector || '',
    linkedin: linkedin || '',
    notes: notes || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Create the contact in Firestore
  try {
    const contactRef = await db.collection('contacts').add(contactData);
    console.log('✅ Contact created successfully with ID:', contactRef.id);

    // Log the action
    await logAction(originalCommand, 'create', contactRef.id, contactData, null, null);

    return {
      success: true,
      message: `✅ Created new contact: ${contactData.firstName} ${contactData.lastName}${contactData.email ? ` (${contactData.email})` : ''}`,
      action: 'create',
      contactId: contactRef.id,
      contactName: `${contactData.firstName} ${contactData.lastName}`.trim(),
      contactData: contactData
    };
  } catch (createError) {
    console.error('❌ Error creating contact:', createError);
    return {
      success: false,
      error: 'Failed to create contact. Please try again.',
      details: 'Database creation failed'
    };
  }
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
  console.log('🔍 findContact called with identifier:', identifier);
  const contactsRef = db.collection('contacts');
  let contactQuery;

  // Clean the identifier
  const cleanIdentifier = identifier.trim();
  console.log('🔍 Cleaned identifier:', cleanIdentifier);

  if (cleanIdentifier.includes('@')) {
    // Search by email
    console.log('🔍 Searching by email:', cleanIdentifier);
    contactQuery = contactsRef.where('email', '==', cleanIdentifier);
  } else if (cleanIdentifier.includes(' ')) {
    // Search by firstName + lastName
    const nameParts = cleanIdentifier.split(' ');
    console.log('🔍 Name parts:', nameParts);
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' '); // Handle multi-word last names
      console.log('🔍 Searching by firstName + lastName:', { firstName, lastName });
      contactQuery = contactsRef.where('firstName', '==', firstName).where('lastName', '==', lastName);
    } else {
      // Try searching by firstName only
      console.log('🔍 Searching by firstName only:', cleanIdentifier);
      contactQuery = contactsRef.where('firstName', '==', cleanIdentifier);
    }
  } else {
    // Search by company or firstName
    console.log('🔍 Searching by company first:', cleanIdentifier);
    // First try company
    let companySnapshot = await contactsRef.where('company', '==', cleanIdentifier).get();
    console.log('🔍 Company search results:', companySnapshot.size, 'matches');
    if (!companySnapshot.empty) {
      const contactDoc = companySnapshot.docs[0];
      console.log('✅ Found contact by company:', contactDoc.data());
      return {
        id: contactDoc.id,
        ref: contactDoc.ref,
        data: contactDoc.data()
      };
    }
    
    // If no company match, try firstName
    console.log('🔍 No company match, trying firstName:', cleanIdentifier);
    contactQuery = contactsRef.where('firstName', '==', cleanIdentifier);
  }

  const contactSnapshot = await contactQuery.get();
  console.log('🔍 Contact search results:', contactSnapshot.size, 'matches');
  
  if (contactSnapshot.empty) {
    console.log('❌ No contacts found');
    return null;
  }

  const contactDoc = contactSnapshot.docs[0];
  console.log('✅ Found contact:', contactDoc.data());
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

// Add contact list to listing endpoint
app.post('/add-contact-list-to-listing', async (req, res) => {
  try {
    const { listingId, contactListId } = req.body;

    // Validate input
    if (!listingId || !contactListId) {
      return res.status(400).json({
        error: 'Missing required fields: listingId and contactListId'
      });
    }

    console.log('🔗 Adding contact list to listing:', { listingId, contactListId });

    // Get the listing document
    const listingRef = db.collection('listings').doc(listingId);
    const listingDoc = await listingRef.get();

    if (!listingDoc.exists) {
      return res.status(404).json({
        error: 'Listing not found'
      });
    }

    // Get the contact list document
    const contactListRef = db.collection('contactLists').doc(contactListId);
    const contactListDoc = await contactListRef.get();

    if (!contactListDoc.exists) {
      return res.status(404).json({
        error: 'Contact list not found'
      });
    }

    const listingData = listingDoc.data();
    const currentContactListIds = listingData.contactListIds || [];

    // Check if the contact list is already associated with this listing
    if (currentContactListIds.includes(contactListId)) {
      return res.status(400).json({
        error: 'Contact list is already associated with this listing'
      });
    }

    // Add the contact list ID to the listing
    const updatedContactListIds = [...currentContactListIds, contactListId];
    
    await listingRef.update({
      contactListIds: updatedContactListIds,
      updatedAt: new Date()
    });

    console.log('✅ Contact list added to listing successfully');

    // Log the action
    await db.collection('ai_list_actions').add({
      action: 'add_contact_list_to_listing',
      listingId: listingId,
      contactListId: contactListId,
      contactListName: contactListDoc.data().name,
      listingName: listingData.name || listingData.address || 'Unknown Listing',
      timestamp: new Date(),
      success: true
    });

    res.json({
      success: true,
      message: `Contact list "${contactListDoc.data().name}" has been added to the listing`,
      listingId: listingId,
      contactListId: contactListId,
      updatedContactListIds: updatedContactListIds
    });

  } catch (error) {
    console.error('Error adding contact list to listing:', error);
    res.status(500).json({
      error: 'Failed to add contact list to listing',
      details: error.message
    });
  }
});

// Get all listings endpoint (for dropdown selection)
app.get('/listings', async (req, res) => {
  try {
    const listingsRef = db.collection('listings');
    const querySnapshot = await listingsRef.get();
    
    const listings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      listings: listings
    });

  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      error: 'Failed to fetch listings',
      details: error.message
    });
  }
});

// ===== ACTIVITIES ENDPOINTS =====

// Create a new activity for a contact
app.post('/activities', async (req, res) => {
  try {
    const { contactId, type, description, date, duration, notes, connectToListing, selectedListing } = req.body;

    // Validate required fields
    if (!contactId || !type || !description) {
      return res.status(400).json({
        error: 'Missing required fields: contactId, type, and description are required'
      });
    }

    // Validate activity type
    const validTypes = ['call', 'email', 'meeting', 'text', 'note', 'showing', 'follow_up', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid activity type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Verify the contact exists
    const contactRef = db.collection('contacts').doc(contactId);
    const contactDoc = await contactRef.get();

    if (!contactDoc.exists) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    // Create activity data
    const activityData = {
      contactId: contactId,
      type: type,
      description: description,
      date: date ? new Date(date) : new Date(),
      duration: duration || null,
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add listing connection if requested
    if (connectToListing && selectedListing) {
      activityData.listingId = selectedListing.id;
      activityData.listingName = (() => {
        if (selectedListing.name && selectedListing.name.trim()) {
          return selectedListing.name;
        } else if (selectedListing.address && selectedListing.address.trim()) {
          return selectedListing.address;
        } else if (selectedListing.streetAddress && selectedListing.streetAddress.trim()) {
          return selectedListing.streetAddress;
        } else if (selectedListing.title && selectedListing.title.trim()) {
          return selectedListing.title;
        } else {
          return `Listing ${selectedListing.id.slice(-6)}`;
        }
      })();
    }

    // Save to Firestore
    const activityRef = await db.collection('activities').add(activityData);
    
    console.log('✅ Activity created successfully:', {
      activityId: activityRef.id,
      contactId: contactId,
      type: type,
      description: description,
      listingId: activityData.listingId || null
    });

    // If connected to a listing, also add to listing activities
    if (connectToListing && selectedListing) {
      try {
        const listingActivitiesRef = db.collection('listingActivities');
        await listingActivitiesRef.add({
          listingId: selectedListing.id,
          activityId: activityRef.id,
          contactId: contactId,
          type: type,
          description: description,
          date: activityData.date,
          createdAt: new Date()
        });
        
        console.log('✅ Activity connected to listing:', {
          listingId: selectedListing.id,
          activityId: activityRef.id
        });
      } catch (listingError) {
        console.error('❌ Error connecting activity to listing:', listingError);
        // Don't fail the whole operation, just log the error
      }
    }

    res.json({
      success: true,
      message: 'Activity created successfully',
      activityId: activityRef.id,
      activity: {
        id: activityRef.id,
        ...activityData
      }
    });

  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      error: 'Failed to create activity',
      details: error.message
    });
  }
});

// Get all activities for a specific contact
app.get('/activities/contact/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    // Validate contactId
    if (!contactId) {
      return res.status(400).json({
        error: 'Contact ID is required'
      });
    }

    // Verify the contact exists
    const contactRef = db.collection('contacts').doc(contactId);
    const contactDoc = await contactRef.get();

    if (!contactDoc.exists) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    // Get activities for this contact
    const activitiesRef = db.collection('activities');
    const querySnapshot = await activitiesRef
      .where('contactId', '==', contactId)
      .orderBy('date', 'desc')
      .get();

    const activities = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Retrieved ${activities.length} activities for contact ${contactId}`);

    res.json({
      success: true,
      activities: activities,
      count: activities.length
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      error: 'Failed to fetch activities',
      details: error.message
    });
  }
});

// Get all activities (with optional filtering)
app.get('/activities', async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;

    let query = db.collection('activities').orderBy('date', 'desc');

    // Apply type filter if provided
    if (type) {
      const validTypes = ['call', 'email', 'meeting', 'text', 'note', 'showing', 'follow_up', 'other'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `Invalid activity type. Must be one of: ${validTypes.join(', ')}`
        });
      }
      query = query.where('type', '==', type);
    }

    // Apply limit and offset
    query = query.limit(parseInt(limit)).offset(parseInt(offset));

    const querySnapshot = await query.get();

    const activities = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Retrieved ${activities.length} activities`);

    res.json({
      success: true,
      activities: activities,
      count: activities.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      error: 'Failed to fetch activities',
      details: error.message
    });
  }
});

// Update an activity
app.put('/activities/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;
    const { type, description, date, duration, notes } = req.body;

    // Validate activityId
    if (!activityId) {
      return res.status(400).json({
        error: 'Activity ID is required'
      });
    }

    // Check if activity exists
    const activityRef = db.collection('activities').doc(activityId);
    const activityDoc = await activityRef.get();

    if (!activityDoc.exists) {
      return res.status(404).json({
        error: 'Activity not found'
      });
    }

    // Validate activity type if provided
    if (type) {
      const validTypes = ['call', 'email', 'meeting', 'text', 'note', 'showing', 'follow_up', 'other'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `Invalid activity type. Must be one of: ${validTypes.join(', ')}`
        });
      }
    }

    // Prepare update data
    const updateData = {
      updatedAt: new Date()
    };

    if (type) updateData.type = type;
    if (description) updateData.description = description;
    if (date) updateData.date = new Date(date);
    if (duration !== undefined) updateData.duration = duration;
    if (notes !== undefined) updateData.notes = notes;

    // Update the activity
    await activityRef.update(updateData);

    console.log('✅ Activity updated successfully:', activityId);

    res.json({
      success: true,
      message: 'Activity updated successfully',
      activityId: activityId
    });

  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({
      error: 'Failed to update activity',
      details: error.message
    });
  }
});

// Delete an activity
app.delete('/activities/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;

    // Validate activityId
    if (!activityId) {
      return res.status(400).json({
        error: 'Activity ID is required'
      });
    }

    // Check if activity exists
    const activityRef = db.collection('activities').doc(activityId);
    const activityDoc = await activityRef.get();

    if (!activityDoc.exists) {
      return res.status(404).json({
        error: 'Activity not found'
      });
    }

    // Delete the activity
    await activityRef.delete();

    console.log('✅ Activity deleted successfully:', activityId);

    res.json({
      success: true,
      message: 'Activity deleted successfully',
      activityId: activityId
    });

  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      error: 'Failed to delete activity',
      details: error.message
    });
  }
});

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

// Export the app for Firebase Functions
module.exports = app;

// Server startup is handled separately for development
// This file only exports the Express app for Firebase Functions 