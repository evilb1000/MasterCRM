/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { defineSecret } from "firebase-functions/params";


// Initialize Firebase Admin SDK
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Define secrets
const openaiApiSecret = defineSecret("OPENAI_API_KEY");
const googleApiSecret = defineSecret("GOOGLE_API_KEY");



// Chat Cloud Function
export const chat = onRequest(
  { secrets: [openaiApiSecret] },
  async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      const { message } = req.body;

      // Validate input
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          error: 'Invalid input. Please provide a "message" field with a string value.' 
        });
      }

      // Get the secret value
      const apiKey = openaiApiSecret.value();
      if (!apiKey) {
        return res.status(500).json({ 
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY secret.' 
        });
      }

      // Initialize OpenAI client inside the function
      const openai = new OpenAI({
        apiKey: apiKey,
      });

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
          message,
          reply,
          timestamp: FieldValue.serverTimestamp(),
          model: 'gpt-4',
          tokens_used: completion.usage?.total_tokens || 0
        };

        await db.collection('conversations').add(conversationData);
        logger.info('✅ Conversation saved to Firestore');
      } catch (firestoreError) {
        logger.error('❌ Error saving to Firestore:', firestoreError);
        // Don't fail the request if Firestore save fails
      }

      res.json({ reply });

    } catch (error) {
      logger.error('Error in chat function:', error);
      
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
  }
);

// AI Contact Action function
export const aiContactAction = onRequest(
  { secrets: [openaiApiSecret] },
  async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      const { command } = req.body;
      
      logger.info('🤖 AI Contact Action Request:', { command });

      // Validate input
      if (!command || typeof command !== 'string') {
        logger.error('❌ Invalid input received:', { command });
        return res.status(400).json({ 
          error: 'Invalid input. Please provide a "command" field with a string value.' 
        });
      }

      // Get the secret value
      const apiKey = openaiApiSecret.value();
      if (!apiKey) {
        return res.status(500).json({ 
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY secret.' 
        });
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      // Step 1: Analyze user intent with GPT
      const intentPrompt = `
You are a CRM assistant that analyzes user requests and determines what they want to do with contact information.

Available actions:
- UPDATE_CONTACT: User wants to update existing contact information (edit, change, modify, set, update)
- ADD_NOTE: User wants to add a note to an existing contact (add note, append note, include note)
- CREATE_ACTIVITY: User wants to log an activity for a contact WITHOUT attaching to a listing (called, emailed, met with, texted, showed property to)
- CREATE_CONTACT: User wants to create a new contact
- DELETE_CONTACT: User wants to delete a contact or contact field
- SEARCH_CONTACT: User wants to find or search for contacts
- LIST_CONTACTS: User wants to see all contacts
- CREATE_LIST: User wants to create a contact list based on criteria (MUST include "create" keyword)
- FILTER_CONTACTS: User wants to display/filter existing contacts temporarily (MUST include "show me" or similar display keywords)
- ATTACH_LIST_TO_LISTING: User wants to attach an existing contact list to a listing
- COMBINED_LIST_CREATION_AND_ATTACHMENT: User wants to create a contact list with criteria and then attach it to a listing in one command
- COMBINED_ACTIVITY_CREATION_AND_LISTING_ATTACHMENT: User wants to create an activity for a contact AND attach it to a listing in one command
- PROSPECT_BUSINESSES: User wants to find businesses in a specific location and category (find businesses, prospect, search for companies, locate businesses)
- GENERAL_QUERY: User is asking a general question about the CRM system

**CRITICAL: Use COMBINED_ACTIVITY_CREATION_AND_LISTING_ATTACHMENT when a listing is mentioned in the activity. Use CREATE_ACTIVITY only when NO listing is mentioned.**

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

IMPORTANT: For CREATE_ACTIVITY and COMBINED_ACTIVITY_CREATION_AND_LISTING_ATTACHMENT, look for these NATURAL LANGUAGE patterns:

**COMBINED_ACTIVITY_CREATION_AND_LISTING_ATTACHMENT** (when listing is mentioned):
- "Emailed [contact] about [listing]. [description]"
- "Called [contact] regarding [listing]. [description]"
- "Met with [contact] at [listing]. [description]"
- "Texted [contact] about [listing]. [description]"
- "Showed [listing] to [contact]. [description]"
- "Spoke with [contact] about [listing]. [description]"
- "Contacted [contact] regarding [listing]. [description]"
- "Reached out to [contact] about [listing]. [description]"
- "[contact] and I discussed [listing]. [description]"
- "Had a [activity_type] with [contact] about [listing]. [description]"

**CREATE_ACTIVITY** (when NO listing is mentioned):
- "Emailed [contact]. [description]"
- "Called [contact]. [description]"
- "Met with [contact]. [description]"
- "Texted [contact]. [description]"

IMPORTANT: For PROSPECT_BUSINESSES, look for these patterns:
- "Find [businessCategory] businesses in [location]"
- "Search for [businessCategory] in [location]"
- "Prospect [businessCategory] companies in [location]"
- "Locate [businessCategory] in [location]"
- "Find businesses in [location] for [businessCategory]"
- "Search [location] for [businessCategory]"
- "Get [businessCategory] prospects in [location]"
- "Find companies in [location] that do [businessCategory]"

CRITICAL: FILTER_CONTACTS vs CREATE_LIST DISTINCTION

FILTER_CONTACTS = "SHOW ME" (display/filter existing contacts temporarily):
- "show me all contacts with [criteria]"
- "show me contacts with [criteria]"
- "find contacts with [criteria]"
- "display contacts with [criteria]"
- "get contacts with [criteria]"
- "contacts with [criteria]"

CREATE_LIST = "CREATE" (make a new permanent list):
- "create a list with [criteria]"
- "create a contact list with [criteria]"
- "make a list with [criteria]"
- "build a list with [criteria]"
- "generate a list with [criteria]"
- "create list with [criteria]"
- "make contact list with [criteria]"

KEY DIFFERENCE: "show me" = FILTER_CONTACTS, "create" = CREATE_LIST

Activity type detection from context:
- "emailed", "email", "sent email" → email
- "called", "phone call", "phoned" → call
- "met", "meeting", "coffee", "lunch" → meeting
- "texted", "text", "SMS", "messaged" → text
- "showed", "tour", "property showing" → showing
- "follow up", "follow-up", "followup" → follow_up
- Default to "other" if unclear

Contact identification can be by:
- Email address (contains @)
- Full name (firstName + lastName)
- Company name
- Partial name matching (e.g., "Jeff" matches "Jeff Burd")

You are an intelligent CRM assistant that understands the context and intent of user requests. Analyze the following user request and respond with ONLY a JSON object in this exact format:

{
  "intent": "UPDATE_CONTACT|ADD_NOTE|CREATE_ACTIVITY|CREATE_CONTACT|DELETE_CONTACT|SEARCH_CONTACT|LIST_CONTACTS|CREATE_LIST|ATTACH_LIST_TO_LISTING|COMBINED_LIST_CREATION_AND_ATTACHMENT|COMBINED_ACTIVITY_CREATION_AND_LISTING_ATTACHMENT|PROSPECT_BUSINESSES|FILTER_CONTACTS|GENERAL_QUERY",
  "confidence": 0.0-1.0,
  "extractedData": {
    "contactIdentifier": "email or firstName+lastName or company (if mentioned)",
    "action": "update|add_note|create_activity|create|delete|search|list|create_list|attach_list_to_listing|combined_activity_creation_and_listing_attachment",
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
    "contactName": "full name of the contact (if creating activity)",
    "listingName": "name or address of the listing (if creating activity)",
    "query": "search terms (if searching)",
    "listName": "suggested list name (if creating list)",
    "listCriteria": "description of what contacts to include in the list",
    "listIdentifier": "name of the list to attach (if attaching list to listing)",
    "listingIdentifier": "name or address of the listing to attach to (if attaching list to listing)",
    "businessCategory": "type of business to search for (if prospecting businesses)",
    "location": "location to search in (if prospecting businesses)",
    "filterCriteria": "the criteria to filter contacts by (if filtering contacts)",
    "filterField": "businessSector|company|address (the field to search in)"
  },
  "userMessage": "A friendly response explaining what you understood they want to do"
}

CRITICAL CONTEXT UNDERSTANDING RULES:

1. BUSINESS PROSPECTING vs CONTACT FILTERING:
   - PROSPECT_BUSINESSES: User wants to find NEW businesses/companies in a location (e.g., "find dentists in Mt. Lebanon", "search for tech companies downtown", "prospect restaurants in Oakland")
   - FILTER_CONTACTS: User wants to filter EXISTING contacts in the database (e.g., "show me contacts with financial services", "find contacts in downtown", "get contacts with tech companies")

2. CONTEXT CLUES FOR BUSINESS PROSPECTING:
   - Contains business categories (dentists, restaurants, tech companies, financial services, etc.)
   - Contains location references (in Mt. Lebanon, downtown, Oakland, etc.)
   - Uses prospecting language (find, search, prospect, locate, get businesses/companies)
   - Implies finding NEW businesses, not existing contacts

3. CONTEXT CLUES FOR CONTACT FILTERING:
   - References existing contacts ("show me contacts", "find contacts", "get contacts")
   - Uses filtering language ("with", "that have", "in the database")
   - Implies searching through existing contact records

4. EXAMPLES:
   - "find dentists in Mt. Lebanon" → PROSPECT_BUSINESSES (businessCategory: "dentists", location: "Mt. Lebanon")
   - "show me contacts with financial services" → FILTER_CONTACTS (filterCriteria: "financial services", filterField: "businessSector")
   - "search for tech companies downtown" → PROSPECT_BUSINESSES (businessCategory: "tech companies", location: "downtown")
   - "find contacts in downtown" → FILTER_CONTACTS (filterCriteria: "downtown", filterField: "address")

5. CONTACT SEARCH vs BUSINESS PROSPECTING:
   - "find John Smith" → SEARCH_CONTACT (contactIdentifier: "John Smith")
   - "find dentists" → PROSPECT_BUSINESSES (businessCategory: "dentists")
   - "show me contacts with Investor business sector" → FILTER_CONTACTS (filterCriteria: "Investor", filterField: "businessSector")

Use your contextual understanding to determine the user's intent based on the meaning and context, not just keywords.

Examples of COMBINED_LIST_CREATION_AND_ATTACHMENT:
- "create a contact list with tech companies criteria, then attach that list to the downtown office listing"
- "make a list with finance companies and attach it to listing 123 Main Street"
- "build a list with investor contacts and attach to the warehouse listing"
- "create a list with healthcare companies criteria, then attach that list to the medical building listing"

Examples of COMBINED_ACTIVITY_CREATION_AND_LISTING_ATTACHMENT:
- "create a call activity for John Smith and attach it to 420 Main St"
- "log an email activity for Elodie Wren and connect it to the downtown office"
- "add a meeting activity for Tom Brady and attach to the shopping center listing"
- "Emailed Jeff Burd about 420 Main Street. Asked if he wanted to tour."
- "Called John Smith regarding the downtown office. Discussed lease terms."
- "Met with Elodie Wren at the shopping center. Showed her the space."
- "Texted Tom Brady about the warehouse listing. He's interested in touring."
- "Spoke with Jeff Burd about 420 Main Street. He asked about parking."
- "Contacted John Smith regarding the office building. Sent him the floor plan."
- "Reached out to Elodie Wren about the retail space. She wants to see it next week."
- "Jeff Burd and I discussed 420 Main Street. He's considering a tour."
- "Had a meeting with John Smith about the downtown office. Talked about square footage."

If the request is unclear or doesn't match any action, set intent to GENERAL_QUERY and confidence to 0.0.

User request: "${command}"

Respond with ONLY the JSON object, no other text.`;

      // Call OpenAI API to analyze intent
      logger.info('🔍 Sending intent analysis request to OpenAI...');
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
      logger.info('🔍 Raw OpenAI Intent Response:', intentResponse);
      
      // Parse the intent analysis
      let intentAnalysis;
      try {
        intentAnalysis = JSON.parse(intentResponse);
        logger.info('🔍 Parsed Intent Analysis:', JSON.stringify(intentAnalysis, null, 2));
      } catch (parseError) {
        logger.error('❌ Failed to parse intent analysis:', intentResponse);
        logger.error('❌ Parse error:', parseError.message);
        return res.status(500).json({ 
          error: 'Failed to understand your request. Please try rephrasing.',
          details: 'Intent analysis parsing failed'
        });
      }

      // Check confidence level - be more lenient for update and note commands
      const minConfidence = (intentAnalysis.intent === 'UPDATE_CONTACT' || intentAnalysis.intent === 'ADD_NOTE') ? 0.2 : 0.3;
      logger.info(`🔍 Confidence check: ${intentAnalysis.confidence} >= ${minConfidence} (${intentAnalysis.confidence >= minConfidence ? 'PASS' : 'FAIL'})`);
      
      if (intentAnalysis.confidence < minConfidence) {
        logger.info('❌ Low confidence in intent analysis');
        return res.status(400).json({ 
          error: 'I\'m not sure what you want to do. Please be more specific.',
          details: 'Low confidence in intent analysis',
          suggestion: intentAnalysis.userMessage,
          debug: intentAnalysis
        });
      }

      // Step 2: Execute action based on intent
      logger.info(`🔍 Executing action: ${intentAnalysis.intent}`);
      let result;
      
      switch (intentAnalysis.intent) {
        case 'UPDATE_CONTACT':
          logger.info('🔧 Handling UPDATE_CONTACT...');
          result = await handleContactUpdate(intentAnalysis.extractedData, command);
          break;
          
        case 'ADD_NOTE':
          logger.info('🔧 Handling ADD_NOTE...');
          result = await handleAddNote(intentAnalysis.extractedData, command);
          break;
          
        case 'CREATE_ACTIVITY':
          logger.info('🔧 Handling CREATE_ACTIVITY...');
          result = await handleCreateActivity(intentAnalysis.extractedData, command);
          break;
          
        case 'CREATE_CONTACT':
          logger.info('🔧 Handling CREATE_CONTACT...');
          result = await handleContactCreation(intentAnalysis.extractedData, command);
          break;
          
        case 'DELETE_CONTACT':
          logger.info('🔧 Handling DELETE_CONTACT...');
          result = await handleContactDeletion(intentAnalysis.extractedData, command);
          break;
          
        case 'SEARCH_CONTACT':
          logger.info('🔧 Handling SEARCH_CONTACT...');
          result = await handleContactSearch(intentAnalysis.extractedData, command);
          break;
          
        case 'LIST_CONTACTS':
          logger.info('🔧 Handling LIST_CONTACTS...');
          result = await handleContactListing(command);
          break;
          
        case 'CREATE_LIST':
          logger.info('🔧 Handling CREATE_LIST...');
          result = await handleListCreation(intentAnalysis.extractedData, command);
          break;
          
        case 'ATTACH_LIST_TO_LISTING':
          logger.info('🔧 Handling ATTACH_LIST_TO_LISTING...');
          result = await handleAttachListToListing(intentAnalysis.extractedData, command);
          break;
          
        case 'COMBINED_LIST_CREATION_AND_ATTACHMENT':
          logger.info('🔧 Handling COMBINED_LIST_CREATION_AND_ATTACHMENT...');
          result = await handleCombinedListCreationAndAttachment(intentAnalysis.extractedData, command);
          break;
        case 'COMBINED_ACTIVITY_CREATION_AND_LISTING_ATTACHMENT':
          logger.info('🔧 Handling COMBINED_ACTIVITY_CREATION_AND_LISTING_ATTACHMENT...');
          result = await handleCombinedActivityCreationAndListingAttachment(intentAnalysis.extractedData, command);
          break;
          
        case 'PROSPECT_BUSINESSES':
          logger.info('🔧 Handling PROSPECT_BUSINESSES...');
          result = await handleBusinessProspecting(intentAnalysis.extractedData, command);
          break;
          
        case 'FILTER_CONTACTS':
          logger.info('🔧 Handling FILTER_CONTACTS...');
          result = await handleContactFiltering(intentAnalysis.extractedData, command);
          break;
          
        case 'GENERAL_QUERY':
          logger.info('🔧 Handling GENERAL_QUERY...');
          result = await handleGeneralQuery(command);
          break;
          
        default:
          logger.info(`❌ Unknown intent type: ${intentAnalysis.intent}`);
          return res.status(400).json({ 
            error: 'Unknown action type. Please try rephrasing your request.',
            details: 'Invalid intent type'
          });
      }

      logger.info('✅ Final result:', JSON.stringify(result, null, 2));
      res.json(result);

    } catch (error) {
      logger.error('❌ Error in aiContactAction function:', error);
      
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
        error: 'An error occurred while processing your contact action request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// AI Task Creation Cloud Function
export const aiCreateTask = onRequest(
  { secrets: [openaiApiSecret] },
  async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      const { command } = req.body;
      
      logger.info('🤖 AI Task Creation Request:', { command });

      // Validate input
      if (!command || typeof command !== 'string') {
        logger.info('❌ Invalid input received:', { command });
        return res.status(400).json({ 
          error: 'Invalid input. Please provide a "command" field with a string value.' 
        });
      }

      // Get the secret value
      const apiKey = openaiApiSecret.value();
      if (!apiKey) {
        logger.info('❌ OpenAI API key not configured');
        return res.status(500).json({ 
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY secret.' 
        });
      }

      // Initialize OpenAI client inside the function
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      // Get current date for GPT context
      const currentDate = new Date();
      const currentDateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentDayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      const currentMonthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
      const currentDay = currentDate.getDate();
      const currentYear = currentDate.getFullYear();
      
      // Step 1: Analyze user intent with GPT for task creation
      const taskIntentPrompt = `
You are a CRM assistant that analyzes user requests to create tasks for contacts OR listings.

CURRENT DATE CONTEXT:
- Today is ${currentDayName}, ${currentMonthName} ${currentDay}, ${currentYear}
- Current date in YYYY-MM-DD format: ${currentDateString}
- Use this as the reference point for all date calculations

Available actions:
- CREATE_TASK: User wants to create a task for a specific contact OR listing

Task creation patterns to look for:

CONTACT TASKS:
- "create a task for [contact] [date] regarding [description]"
- "create task for [contact] [date] about [description]"
- "add task for [contact] [date] [description]"
- "create a task for [contact] [date] to [description]"
- "task for [contact] [date] [description]"
- "create task [contact] [date] [description]"

LISTING TASKS:
- "create a task for listing [address] [date] regarding [description]"
- "create task for listing [address] [date] about [description]"
- "add task for listing [address] [date] [description]"
- "create a task for listing [address] [date] to [description]"
- "task for listing [address] [date] [description]"
- "create task listing [address] [date] [description]"

Date parsing examples (based on current date ${currentDateString}):
- "today" → ${currentDateString}
- "tomorrow" → ${new Date(currentDate.getTime() + 24*60*60*1000).toISOString().split('T')[0]}
- "next Tuesday" → calculate next Tuesday from ${currentDateString}
- "next Monday" → calculate next Monday from ${currentDateString}
- "next Wednesday" → calculate next Wednesday from ${currentDateString}
- "next Thursday" → calculate next Thursday from ${currentDateString}
- "next Friday" → calculate next Friday from ${currentDateString}
- "next Saturday" → calculate next Saturday from ${currentDateString}
- "next Sunday" → calculate next Sunday from ${currentDateString}
- "August 22nd" → 2025-08-22 (specific date)
- "August 22" → 2025-08-22 (specific date)
- "Aug 22" → 2025-08-22 (specific date)
- "8/22" → 2025-08-22 (specific date)
- "in 3 days" → ${new Date(currentDate.getTime() + 3*24*60*60*1000).toISOString().split('T')[0]}
- "in 1 week" → ${new Date(currentDate.getTime() + 7*24*60*60*1000).toISOString().split('T')[0]}
- "in 2 weeks" → ${new Date(currentDate.getTime() + 14*24*60*60*1000).toISOString().split('T')[0]}
- "next week" → ${new Date(currentDate.getTime() + 7*24*60*60*1000).toISOString().split('T')[0]}

CRITICAL: Use the current date ${currentDateString} as your reference point. Do NOT use any dates from 2022 or other years.

Contact identification can be by:
- Full name (firstName + lastName)
- Email address (contains @)
- Company name

Listing identification can be by:
- Street address (e.g., "123 Main St", "Iron City Drive")
- Property address
- Listing address

Analyze the following user request and respond with ONLY a JSON object in this exact format:
{
  "intent": "CREATE_TASK",
  "confidence": 0.0-1.0,
  "extractedData": {
    "taskType": "contact|listing",
    "contactIdentifier": "email or firstName+lastName or company (if contact task)",
    "listingIdentifier": "address or property identifier (if listing task)",
    "taskTitle": "suggested task title based on description",
    "taskDescription": "full description of the task",
    "dueDate": "parsed date in YYYY-MM-DD format",
    "priority": "high|medium|low (default to medium)",
    "status": "pending (default)"
  },
  "userMessage": "A friendly response explaining what task you understood they want to create"
}

If the request is unclear or doesn't match task creation patterns, set intent to GENERAL_QUERY and confidence to 0.0.

Examples of CREATE_TASK commands:

CONTACT TASKS:
- "create a task for Elodie Wren today regarding emailing Martin"
- "create task for john@example.com tomorrow about follow up call"
- "add task for John Smith next Tuesday to review proposal"
- "task for Acme Corp August 22nd regarding contract discussion"
- "create a task for Jane Doe in 3 days about property showing"
- "create task for elodie@example.com next week regarding client meeting"

LISTING TASKS:
- "create a task for listing 123 Main St tomorrow about taking photos"
- "add task for listing Iron City Drive next Tuesday to create marketing material"
- "create task for listing 456 Oak Avenue August 22nd regarding property showing"
- "task for listing 789 Pine Street in 3 days about updating listing description"
- "create a task for listing 321 Elm Road next week regarding client meeting"

User request: "${command}"

Respond with ONLY the JSON object, no other text.`;

      // Call OpenAI API to analyze intent
      logger.info('🔍 Sending task intent analysis request to OpenAI...');
      const taskIntentCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: taskIntentPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.1,
      });

      const taskIntentResponse = taskIntentCompletion.choices[0]?.message?.content || '';
      logger.info('🔍 Raw OpenAI Task Intent Response:', taskIntentResponse);
      
      // Parse the intent analysis
      let taskIntentAnalysis;
      try {
        taskIntentAnalysis = JSON.parse(taskIntentResponse);
        logger.info('🔍 Parsed Task Intent Analysis:', JSON.stringify(taskIntentAnalysis, null, 2));
      } catch (parseError) {
        logger.error('❌ Failed to parse task intent analysis:', taskIntentResponse);
        logger.error('❌ Parse error:', parseError.message);
        return res.status(500).json({ 
          error: 'Failed to understand your task request. Please try rephrasing.',
          details: 'Task intent analysis parsing failed'
        });
      }

      // Check confidence level
      const minConfidence = 0.3;
      logger.info(`🔍 Task confidence check: ${taskIntentAnalysis.confidence} >= ${minConfidence} (${taskIntentAnalysis.confidence >= minConfidence ? 'PASS' : 'FAIL'})`);
      
      if (taskIntentAnalysis.confidence < minConfidence) {
        logger.info('❌ Low confidence in task intent analysis');
        return res.status(400).json({ 
          error: 'I\'m not sure what task you want to create. Please be more specific.',
          details: 'Low confidence in task intent analysis',
          suggestion: taskIntentAnalysis.userMessage,
          debug: taskIntentAnalysis
        });
      }

      // Step 2: Execute task creation
      logger.info(`🔍 Executing task creation: ${taskIntentAnalysis.intent}`);
      let result;
      
      if (taskIntentAnalysis.intent === 'CREATE_TASK') {
        logger.info('🔧 Handling CREATE_TASK...');
        result = await handleTaskCreation(taskIntentAnalysis.extractedData, command);
      } else {
        logger.info(`❌ Unknown task intent type: ${taskIntentAnalysis.intent}`);
        return res.status(400).json({ 
          error: 'I don\'t understand what task you want to create. Please try rephrasing your request.',
          details: 'Invalid task intent type'
        });
      }

      logger.info('✅ Final task creation result:', JSON.stringify(result, null, 2));
      res.json(result);

    } catch (error) {
      logger.error('❌ Error in /ai-create-task endpoint:', error);
      logger.error('❌ Error stack:', error.stack);
      
      // Handle specific OpenAI errors
      if (error.status === 401) {
        logger.info('❌ OpenAI API key error');
        return res.status(401).json({ error: 'Invalid OpenAI API key' });
      } else if (error.status === 429) {
        logger.info('❌ OpenAI rate limit error');
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      } else if (error.status === 400) {
        logger.info('❌ OpenAI invalid request error');
        return res.status(400).json({ error: 'Invalid request to OpenAI API' });
      }
      
      res.status(500).json({ 
        error: 'Failed to create task. Please try again.',
        details: error.message
      });
    }
  }
);

// Get all listings endpoint (for dropdown selection)
export const getListings = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    logger.info('📋 Fetching listings for dropdown selection');
    
    const listingsRef = db.collection('listings');
    const querySnapshot = await listingsRef.get();
    
    const listings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info(`✅ Successfully fetched ${listings.length} listings`);

    res.json({
      success: true,
      listings: listings
    });

  } catch (error) {
    logger.error('❌ Error fetching listings:', error);
    res.status(500).json({
      error: 'Failed to fetch listings',
      details: error.message
    });
  }
});

// Add contact list to listing endpoint
export const addContactListToListing = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const { listingId, contactListId } = req.body;

    // Validate input
    if (!listingId || !contactListId) {
      return res.status(400).json({
        error: 'Missing required fields: listingId and contactListId'
      });
    }

    logger.info('🔗 Adding contact list to listing:', { listingId, contactListId });

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

    logger.info('✅ Contact list added to listing successfully');

    // Log the action
    await db.collection('ai_list_actions').add({
      action: 'add_contact_list_to_listing',
      listingId: listingId,
      contactListId: contactListId,
      contactListName: contactListDoc.data().name,
      listingName: listingData.name || listingData.address || 'Unknown Listing',
      timestamp: FieldValue.serverTimestamp(),
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
    logger.error('❌ Error adding contact list to listing:', error);
    res.status(500).json({
      error: 'Failed to add contact list to listing',
      details: error.message
    });
  }
});

// Helper function to find contact by identifier
async function findContact(identifier) {
  logger.info('🔍 findContact called with identifier:', identifier);
  const contactsRef = db.collection('contacts');
  let contactQuery;

  // Clean the identifier
  const cleanIdentifier = identifier.trim();
  logger.info('🔍 Cleaned identifier:', cleanIdentifier);

  if (cleanIdentifier.includes('@')) {
    // Search by email
    logger.info('🔍 Searching by email:', cleanIdentifier);
    contactQuery = contactsRef.where('email', '==', cleanIdentifier);
  } else if (cleanIdentifier.includes(' ')) {
    // Search by firstName + lastName
    const nameParts = cleanIdentifier.split(' ');
    logger.info('🔍 Name parts:', nameParts);
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' '); // Handle multi-word last names
      logger.info('🔍 Searching by firstName + lastName:', { firstName, lastName });
      contactQuery = contactsRef.where('firstName', '==', firstName).where('lastName', '==', lastName);
    } else {
      // Try searching by firstName only
      logger.info('🔍 Searching by firstName only:', cleanIdentifier);
      contactQuery = contactsRef.where('firstName', '==', cleanIdentifier);
    }
  } else {
    // Search by company or firstName
    logger.info('🔍 Searching by company first:', cleanIdentifier);
    // First try company
    let companySnapshot = await contactsRef.where('company', '==', cleanIdentifier).get();
    logger.info('🔍 Company search results:', companySnapshot.size, 'matches');
    if (!companySnapshot.empty) {
      const contactDoc = companySnapshot.docs[0];
      logger.info('✅ Found contact by company:', contactDoc.data());
      return {
        id: contactDoc.id,
        ref: contactDoc.ref,
        data: contactDoc.data()
      };
    }
    
    // If no company match, try firstName
    logger.info('🔍 No company match, trying firstName:', cleanIdentifier);
    contactQuery = contactsRef.where('firstName', '==', cleanIdentifier);
  }

  const contactSnapshot = await contactQuery.get();
  logger.info('🔍 Contact search results:', contactSnapshot.size, 'matches');
  
  if (contactSnapshot.empty) {
    logger.info('❌ No contacts found');
    return null;
  }

  const contactDoc = contactSnapshot.docs[0];
  logger.info('✅ Found contact:', contactDoc.data());
  return {
    id: contactDoc.id,
    ref: contactDoc.ref,
    data: contactDoc.data()
  };
}

// Helper function to find listing by identifier
async function findListing(identifier) {
  logger.info('🔍 findListing called with identifier:', identifier);
  const listingsRef = db.collection('listings');
  let listingQuery;

  // Clean the identifier
  const cleanIdentifier = identifier.trim();
  logger.info('🔍 Cleaned listing identifier:', cleanIdentifier);

  // Get all listings to search through them (since Firestore doesn't support partial text search)
  logger.info('🔍 Fetching all listings for flexible search...');
  const allListingsSnapshot = await listingsRef.get();
  
  if (allListingsSnapshot.empty) {
    logger.info('❌ No listings found in database');
    return null;
  }

  // Search through all listings for matches
  for (const listingDoc of allListingsSnapshot.docs) {
    const listingData = listingDoc.data();
    logger.info('🔍 Checking listing:', listingData);
    
    // Check streetAddress (most common)
    if (listingData.streetAddress) {
      const streetAddress = listingData.streetAddress.trim();
      if (streetAddress.toLowerCase().includes(cleanIdentifier.toLowerCase()) || 
          cleanIdentifier.toLowerCase().includes(streetAddress.toLowerCase())) {
        logger.info('✅ Found listing by streetAddress match:', streetAddress);
        return {
          id: listingDoc.id,
          ref: listingDoc.ref,
          data: listingData
        };
      }
    }
    
    // Check address field
    if (listingData.address) {
      const address = listingData.address.trim();
      if (address.toLowerCase().includes(cleanIdentifier.toLowerCase()) || 
          cleanIdentifier.toLowerCase().includes(address.toLowerCase())) {
        logger.info('✅ Found listing by address match:', address);
        return {
          id: listingDoc.id,
          ref: listingDoc.ref,
          data: listingData
        };
      }
    }
    
    // Check name field
    if (listingData.name) {
      const name = listingData.name.trim();
      if (name.toLowerCase().includes(cleanIdentifier.toLowerCase()) || 
          cleanIdentifier.toLowerCase().includes(name.toLowerCase())) {
        logger.info('✅ Found listing by name match:', name);
        return {
          id: listingDoc.id,
          ref: listingDoc.ref,
          data: listingData
        };
      }
    }
    
    // Check title field
    if (listingData.title) {
      const title = listingData.title.trim();
      if (title.toLowerCase().includes(cleanIdentifier.toLowerCase()) || 
          cleanIdentifier.toLowerCase().includes(title.toLowerCase())) {
        logger.info('✅ Found listing by title match:', title);
        return {
          id: listingDoc.id,
          ref: listingDoc.ref,
          data: listingData
        };
      }
    }
  }

  logger.info('❌ No listings found for identifier:', cleanIdentifier);
  return null;
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
      timestamp: FieldValue.serverTimestamp(),
      success: true
    });
  } catch (error) {
    logger.error('Failed to log action:', error);
  }
}

// Helper function to handle contact updates
async function handleContactUpdate(extractedData, originalCommand) {
  const { contactIdentifier, field, value } = extractedData;
  
  logger.info('🔍 Contact Update Debug:', { contactIdentifier, field, value });
  
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
  logger.info('🔍 Searching for contact with identifier:', contactIdentifier);
  const contact = await findContact(contactIdentifier);
  
  if (!contact) {
    return {
      success: false,
      error: `Contact not found with identifier: "${contactIdentifier}". Please check the contact details and try again.`,
      details: `No contact found with identifier: ${contactIdentifier}`,
      suggestion: 'Try using the contact\'s email address, full name, or company name.'
    };
  }

  logger.info('✅ Found contact:', contact.data.firstName, contact.data.lastName);

  // Update the contact
  try {
    await contact.ref.update({ [field]: value });
    logger.info('✅ Contact updated successfully');
  } catch (updateError) {
    logger.error('❌ Error updating contact:', updateError);
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

// Helper function to handle adding notes
async function handleAddNote(extractedData, originalCommand) {
  const { contactIdentifier, value } = extractedData;
  
  logger.info('🔍 Add Note Debug:', { contactIdentifier, value });
  
  if (!contactIdentifier || !value) {
    return {
      success: false,
      error: 'Missing required information for adding note. Please specify the contact and the note content.',
      details: 'Incomplete note data',
      debug: { contactIdentifier, value }
    };
  }

  // Find the contact
  logger.info('🔍 Searching for contact with identifier:', contactIdentifier);
  const contact = await findContact(contactIdentifier);
  
  if (!contact) {
    return {
      success: false,
      error: `Contact not found with identifier: "${contactIdentifier}". Please check the contact details and try again.`,
      details: `No contact found with identifier: ${contactIdentifier}`,
      suggestion: 'Try using the contact\'s email address, full name, or company name.'
    };
  }

  logger.info('✅ Found contact:', contact.data.firstName, contact.data.lastName);

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
    logger.info('✅ Note added successfully');
  } catch (updateError) {
    logger.error('❌ Error adding note:', updateError);
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
    contactName: `${contact.data.firstName} ${contact.data.lastName}`
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
    logger.info('✅ Activity created successfully:', {
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
    logger.error('❌ Error creating activity:', error);
    return {
      success: false,
      error: 'Failed to create activity. Please try again.',
      details: 'Database operation failed'
    };
  }
}

// Helper function to handle contact creation
async function handleContactCreation(extractedData, originalCommand) {
  logger.info('🔍 Contact Creation Debug:', extractedData);
  
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
    logger.info('✅ Contact created successfully with ID:', contactRef.id);

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
    logger.error('❌ Error creating contact:', createError);
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
    await contact.ref.update({ [field]: FieldValue.delete() });
    
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
    logger.info('🔍 List Creation Criteria:', { listCriteria, listName });
    
    // Extract just the business sector from the criteria
    let searchTerm = listCriteria;
    if (listCriteria.toLowerCase().includes('investor')) {
      searchTerm = 'investor';
    } else if (listCriteria.toLowerCase().includes('tech')) {
      searchTerm = 'tech';
    } else if (listCriteria.toLowerCase().includes('finance')) {
      searchTerm = 'finance';
    }
    
    logger.info('🔍 Simplified search term:', searchTerm);
    const contacts = await queryContactsByCriteria({ searchTerms: searchTerm });

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
    logger.error('Error creating list:', error);
    return {
      success: false,
      error: 'Failed to create the list. Please try again.',
      details: 'List creation failed'
    };
  }
}

// Helper function to handle combined list creation and attachment workflow
async function handleCombinedListCreationAndAttachment(extractedData, originalCommand) {
  const { listName, listCriteria, listingIdentifier } = extractedData;
  
  logger.info('🔄 Combined List Creation and Attachment Debug:', { listName, listCriteria, listingIdentifier });
  
  if (!listName || !listCriteria || !listingIdentifier) {
    return {
      success: false,
      error: 'Please specify the list name, criteria, and the listing to attach it to.',
      details: 'Missing list name, criteria, or listing identifier',
      suggestion: 'Try: "create a contact list with tech companies criteria, then attach that list to the downtown office listing"'
    };
  }

  try {
    // Step 1: Create the list
    logger.info('📋 Step 1: Creating list with criteria:', listCriteria);
    
    // Extract just the business sector from the criteria
    let searchTerm = listCriteria;
    
    // Extract business sector keywords from the criteria
    const sectorKeywords = ['investor', 'tech', 'finance', 'retail', 'healthcare', 'education', 'real estate', 'consulting', 'manufacturing', 'hospitality', 'food', 'automotive', 'media', 'entertainment'];
    
    for (const keyword of sectorKeywords) {
      if (listCriteria.toLowerCase().includes(keyword.toLowerCase())) {
        searchTerm = keyword;
        break;
      }
    }
    
    // If no specific sector found, try to extract from quotes or common patterns
    if (searchTerm === listCriteria) {
      const quoteMatch = listCriteria.match(/"([^"]+)"/);
      if (quoteMatch) {
        searchTerm = quoteMatch[1];
      } else {
        // Try to extract the last word that might be a sector
        const words = listCriteria.toLowerCase().split(' ');
        for (let i = words.length - 1; i >= 0; i--) {
          if (sectorKeywords.includes(words[i])) {
            searchTerm = words[i];
            break;
          }
        }
      }
    }
    
    logger.info('🔍 Simplified search term:', searchTerm);
    const contacts = await queryContactsByCriteria({ searchTerms: searchTerm });

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
    logger.info('✅ List created successfully:', listRef.id);

    // Step 2: Find the listing
    logger.info('🔍 Step 2: Searching for listing:', listingIdentifier);
    const listingsRef = db.collection('listings');
    const listingsSnapshot = await listingsRef.get();
    
    let targetListing = null;
    for (const doc of listingsSnapshot.docs) {
      const listingData = doc.data();
      const listingName = listingData.name || listingData.address || listingData.streetAddress || listingData.title || '';
      
      if (listingName.toLowerCase().includes(listingIdentifier.toLowerCase()) ||
          listingIdentifier.toLowerCase().includes(listingName.toLowerCase()) ||
          doc.id.includes(listingIdentifier)) {
        targetListing = { id: doc.id, ...listingData };
        break;
      }
    }

    if (!targetListing) {
      return {
        success: false,
        error: `Listing "${listingIdentifier}" not found.`,
        details: 'Listing not found',
        suggestion: 'Please check the listing name/address and try again.'
      };
    }

    logger.info('✅ Found listing:', targetListing.name || targetListing.address);

    // Step 3: Attach the list to the listing
    const currentContactListIds = targetListing.contactListIds || [];
    if (currentContactListIds.includes(listRef.id)) {
      return {
        success: false,
        error: `The list "${listName}" is already attached to this listing.`,
        details: 'List already attached'
      };
    }

    // Attach the list to the listing
    const updatedContactListIds = [...currentContactListIds, listRef.id];
    
    await listingsRef.doc(targetListing.id).update({
      contactListIds: updatedContactListIds,
      updatedAt: new Date()
    });

    logger.info('✅ List attached to listing successfully');

    // Log the combined action
    await logListAction(originalCommand, 'combined_create_and_attach', listRef.id, listData);

    return {
      success: true,
      message: `Successfully created list "${listName}" with ${contacts.length} contacts and attached it to the listing.`,
      action: 'combined_create_and_attach',
      listId: listRef.id,
      listName: listName,
      listingId: targetListing.id,
      listingName: targetListing.name || targetListing.address,
      contactCount: contacts.length,
      contacts: contacts.map(c => ({
        id: c.id,
        name: `${c.data.firstName} ${c.data.lastName}`,
        email: c.data.email,
        company: c.data.company
      }))
    };

  } catch (error) {
    logger.error('❌ Error in combined list creation and attachment:', error);
    return {
      success: false,
      error: 'Failed to create the list and attach it to the listing. Please try again.',
      details: 'Combined workflow failed'
    };
  }
}

// Helper function to handle combined activity creation and listing attachment
async function handleCombinedActivityCreationAndListingAttachment(extractedData, originalCommand) {
  const { contactIdentifier, contactName, activityType, activityDescription, listingIdentifier, listingName } = extractedData;
  
  logger.info('🔍 Combined Activity Creation and Listing Attachment Debug:', { 
    contactIdentifier, 
    contactName,
    activityType, 
    activityDescription, 
    listingIdentifier,
    listingName,
    fullExtractedData: extractedData 
  });
  
  if (!contactIdentifier || !activityType || (!listingIdentifier && !listingName)) {
    return {
      success: false,
      error: 'Please specify the contact, activity type, and listing to attach the activity to.',
      details: 'Missing required parameters',
      suggestion: 'Try: "create a call activity for John Smith and attach it to 420 Main St"'
    };
  }

  try {
      // Step 1: Find the contact
  const contactToFind = contactName || contactIdentifier;
  logger.info('👤 Step 1: Finding contact:', contactToFind);
  const contact = await findContact(contactToFind);
    
    if (!contact) {
      return {
        success: false,
        error: `Contact "${contactIdentifier}" not found.`,
        details: 'Contact not found',
        suggestion: 'Please check the contact name/email and try again.'
      };
    }

    logger.info('✅ Found contact:', contact.data.firstName + ' ' + contact.data.lastName);

    // Step 2: Create the activity
    logger.info('📝 Step 2: Creating activity:', activityType);
    
    const activityData = {
      contactId: contact.id,
      type: activityType,
      description: activityDescription || originalCommand || `Activity with ${contact.data.firstName} ${contact.data.lastName}`,
      date: new Date(),
      createdAt: new Date(),
      createdBy: 'AI'
    };

    const activityRef = await db.collection('activities').add(activityData);
    logger.info('✅ Activity created successfully:', activityRef.id);

      // Step 3: Find the listing
  const listingToFind = listingName || listingIdentifier;
  logger.info('🏢 Step 3: Searching for listing:', listingToFind);
  const listingsRef = db.collection('listings');
  const listingsSnapshot = await listingsRef.get();
  
  let targetListing = null;
  for (const doc of listingsSnapshot.docs) {
    const listingData = doc.data();
    const listingDisplayName = listingData.name || listingData.address || listingData.streetAddress || listingData.title || '';
    
    if (listingDisplayName.toLowerCase().includes(listingToFind.toLowerCase()) ||
        listingToFind.toLowerCase().includes(listingDisplayName.toLowerCase()) ||
        doc.id.includes(listingToFind)) {
      targetListing = { id: doc.id, ...listingData };
      break;
    }
  }

    if (!targetListing) {
      return {
        success: false,
        error: `Listing "${listingIdentifier}" not found.`,
        details: 'Listing not found',
        suggestion: 'Please check the listing name/address and try again.'
      };
    }

    logger.info('✅ Found listing:', targetListing.name || targetListing.address);
    logger.info('🔍 Full listing data:', JSON.stringify(targetListing, null, 2));

    // Step 4: Update the activity with listing information
    await activityRef.update({
      listingId: targetListing.id,
      listingName: (() => {
        if (targetListing.name && targetListing.name.trim()) {
          return targetListing.name;
        } else if (targetListing.address && targetListing.address.trim()) {
          return targetListing.address;
        } else if (targetListing.streetAddress && targetListing.streetAddress.trim()) {
          return targetListing.streetAddress;
        } else if (targetListing.title && targetListing.title.trim()) {
          return targetListing.title;
        } else {
          return `Listing ${targetListing.id.slice(-6)}`;
        }
      })()
    });

    logger.info('✅ Activity updated with listing information');

    // Step 5: Add activity to listing's activityIds array
    const currentActivityIds = targetListing.activityIds || [];
    if (currentActivityIds.includes(activityRef.id)) {
      return {
        success: false,
        error: `This activity is already attached to this listing.`,
        details: 'Activity already attached'
      };
    }

    // Attach the activity to the listing
    const updatedActivityIds = [...currentActivityIds, activityRef.id];
    
    await listingsRef.doc(targetListing.id).update({
      activityIds: updatedActivityIds,
      updatedAt: new Date()
    });

    logger.info('✅ Activity attached to listing successfully');

    // Log the combined action
    await logAction(originalCommand, 'combined_activity_and_listing', contact.id, contact.data, 'activity', activityType);

    // Determine the listing display name using the same logic as contact lists
    const listingDisplayName = (() => {
      if (targetListing.name && targetListing.name.trim()) {
        return targetListing.name;
      } else if (targetListing.address && targetListing.address.trim()) {
        return targetListing.address;
      } else if (targetListing.streetAddress && targetListing.streetAddress.trim()) {
        return targetListing.streetAddress;
      } else if (targetListing.title && targetListing.title.trim()) {
        return targetListing.title;
      } else {
        return `Listing ${targetListing.id.slice(-6)}`;
      }
    })();

    return {
      success: true,
      message: `Successfully created ${activityType} activity for ${contact.data.firstName} ${contact.data.lastName} and attached it to the listing.`,
      action: 'combined_activity_and_listing',
      activityId: activityRef.id,
      activityType: activityType,
      contactId: contact.id,
      contactName: `${contact.data.firstName} ${contact.data.lastName}`,
      listingId: targetListing.id,
      listingName: listingDisplayName,
      activityDescription: activityData.description
    };

  } catch (error) {
    logger.error('❌ Error in combined activity creation and listing attachment:', error);
    return {
      success: false,
      error: 'Failed to create the activity and attach it to the listing. Please try again.',
      details: 'Combined workflow failed'
    };
  }
}

// Helper function to handle attaching lists to listings
async function handleAttachListToListing(extractedData, originalCommand) {
  const { listIdentifier, listingIdentifier } = extractedData;
  
  logger.info('🔍 Attach List to Listing Debug:', { listIdentifier, listingIdentifier });
  
  if (!listIdentifier || !listingIdentifier) {
    return {
      success: false,
      error: 'Please specify both the list name and the listing to attach it to.',
      details: 'Missing list or listing identifier',
      suggestion: 'Try: "attach the tech companies list to the downtown office listing"'
    };
  }

  try {
    // Find the contact list
    logger.info('🔍 Searching for contact list:', listIdentifier);
    const listsRef = db.collection('contactLists');
    const listsSnapshot = await listsRef.get();
    
    let targetList = null;
    for (const doc of listsSnapshot.docs) {
      const listData = doc.data();
      if (listData.name.toLowerCase().includes(listIdentifier.toLowerCase()) ||
          listIdentifier.toLowerCase().includes(listData.name.toLowerCase())) {
        targetList = { id: doc.id, ...listData };
        break;
      }
    }

    if (!targetList) {
      return {
        success: false,
        error: `Contact list "${listIdentifier}" not found.`,
        details: 'List not found',
        suggestion: 'Please check the list name and try again.'
      };
    }

    logger.info('✅ Found contact list:', targetList.name);

    // Find the listing
    logger.info('🔍 Searching for listing:', listingIdentifier);
    const listingsRef = db.collection('listings');
    const listingsSnapshot = await listingsRef.get();
    
    let targetListing = null;
    for (const doc of listingsSnapshot.docs) {
      const listingData = doc.data();
      const listingName = listingData.name || listingData.address || listingData.streetAddress || listingData.title || '';
      
      if (listingName.toLowerCase().includes(listingIdentifier.toLowerCase()) ||
          listingIdentifier.toLowerCase().includes(listingName.toLowerCase()) ||
          doc.id.includes(listingIdentifier)) {
        targetListing = { id: doc.id, ...listingData };
        break;
      }
    }

    if (!targetListing) {
      return {
        success: false,
        error: `Listing "${listingIdentifier}" not found.`,
        details: 'Listing not found',
        suggestion: 'Please check the listing name/address and try again.'
      };
    }

    logger.info('✅ Found listing:', targetListing.name || targetListing.address);

    // Check if the list is already attached to this listing
    const currentContactListIds = targetListing.contactListIds || [];
    if (currentContactListIds.includes(targetList.id)) {
      return {
        success: false,
        error: `The list "${targetList.name}" is already attached to this listing.`,
        details: 'List already attached'
      };
    }

    // Attach the list to the listing
    const updatedContactListIds = [...currentContactListIds, targetList.id];
    
    await listingsRef.doc(targetListing.id).update({
      contactListIds: updatedContactListIds,
      updatedAt: new Date()
    });

    logger.info('✅ List attached to listing successfully');

    // Determine the listing display name using the same logic as ListingSelector
    const listingDisplayName = (() => {
      if (targetListing.name && targetListing.name.trim()) {
        return targetListing.name;
      } else if (targetListing.address && targetListing.address.trim()) {
        return targetListing.address;
      } else if (targetListing.streetAddress && targetListing.streetAddress.trim()) {
        return targetListing.streetAddress;
      } else if (targetListing.title && targetListing.title.trim()) {
        return targetListing.title;
      } else {
        return `Listing ${targetListing.id.slice(-6)}`;
      }
    })();

    // Log the action
    await db.collection('ai_list_actions').add({
      action: 'attach_list_to_listing',
      listId: targetList.id,
      listName: targetList.name,
      listingId: targetListing.id,
      listingName: listingDisplayName,
      timestamp: FieldValue.serverTimestamp(),
      success: true
    });

    return {
      success: true,
      message: `✅ Attached list "${targetList.name}" to listing "${listingDisplayName}"`,
      action: 'attach_list_to_listing',
      listId: targetList.id,
      listName: targetList.name,
      listingId: targetListing.id,
      listingName: listingDisplayName,
      contactCount: targetList.contactIds ? targetList.contactIds.length : 0
    };

  } catch (error) {
    logger.error('❌ Error attaching list to listing:', error);
    return {
      success: false,
      error: 'Failed to attach list to listing. Please try again.',
      details: 'Database operation failed'
    };
  }
}

// Helper function to handle business prospecting
async function handleBusinessProspecting(extractedData, originalCommand) {
  try {
    const { businessCategory, location } = extractedData;
    
    logger.info('🔍 Business Prospecting Request:', { businessCategory, location, originalCommand });

    // Validate required fields
    if (!businessCategory || !location) {
      return {
        success: false,
        error: 'Missing required information. Please specify both business category and location.',
        details: 'businessCategory and location are required for business prospecting',
        suggestion: 'Try: "Find financial services businesses in Mt. Lebanon"'
      };
    }

    // Call the prospectBusinesses function
    const response = await fetch('https://prospectbusinesses-obagwr34kq-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessCategory: businessCategory,
        location: location
      })
    });

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        message: result.message,
        action: 'prospect_businesses',
        data: result.data,
        businessesFound: result.data.businesses.length
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to find businesses',
        details: result.details || 'Business prospecting failed'
      };
    }

  } catch (error) {
    logger.error('❌ Error in business prospecting:', error);
    return {
      success: false,
      error: 'Failed to process business prospecting request',
      details: 'Business prospecting processing failed'
    };
  }
}

// Helper function to handle contact filtering
async function handleContactFiltering(extractedData, originalCommand) {
  try {
    const { filterCriteria, filterField } = extractedData;
    
    logger.info('🔍 Contact Filtering Request:', { filterCriteria, filterField, originalCommand });

    // Validate required fields
    if (!filterCriteria) {
      return {
        success: false,
        error: 'Missing filter criteria. Please specify what you want to filter contacts by.',
        details: 'filterCriteria is required for contact filtering',
        suggestion: 'Try: "show me contacts with financial services"'
      };
    }

    // Determine which field to search based on AI analysis or fallback to smart detection
    let searchField = filterField;
    if (!searchField) {
      // Smart field detection (fallback)
      const term = filterCriteria.toLowerCase();
      
      // Business sector keywords
      const businessSectorKeywords = [
        'financial', 'finance', 'banking', 'insurance', 'real estate', 'healthcare', 'medical', 'dental',
        'legal', 'law', 'technology', 'tech', 'software', 'consulting', 'retail', 'restaurant', 'food',
        'automotive', 'auto', 'construction', 'manufacturing', 'education', 'school', 'university',
        'government', 'nonprofit', 'charity', 'marketing', 'advertising', 'media', 'entertainment', 'investor'
      ];
      
      // Location keywords
      const locationKeywords = [
        'pittsburgh', 'mt. lebanon', 'bethel park', 'bridgeville', 'south hills', 'north hills',
        'east end', 'west end', 'downtown', 'oakland', 'shadyside', 'squirrel hill', 'lawrenceville',
        'strip district', 'south side', 'north side', 'east liberty', 'bloomfield', 'garfield'
      ];
      
      if (businessSectorKeywords.some(keyword => term.includes(keyword))) {
        searchField = 'businessSector';
      } else if (locationKeywords.some(keyword => term.includes(keyword))) {
        searchField = 'address';
      } else {
        searchField = 'company'; // Default to company search
      }
    }

    // Query contacts from Firestore
    const contactsRef = db.collection('contacts');
    const snapshot = await contactsRef.get();
    
    if (snapshot.empty) {
      return {
        success: false,
        error: 'No contacts found in the database.',
        details: 'Database is empty'
      };
    }

    // Filter contacts based on criteria
    const searchTerm = filterCriteria.toLowerCase();
    const filteredContacts = [];
    
    snapshot.forEach(doc => {
      const contactData = doc.data();
      const fieldValue = (contactData[searchField] || '').toLowerCase();
      
      if (fieldValue.includes(searchTerm)) {
        filteredContacts.push({
          id: doc.id,
          data: contactData
        });
      }
    });

    if (filteredContacts.length === 0) {
      return {
        success: false,
        error: `No contacts found matching "${filterCriteria}" in ${searchField === 'businessSector' ? 'business sector' : searchField === 'address' ? 'address' : 'company'}.`,
        details: 'No matching contacts found',
        searchField: searchField,
        filterCriteria: filterCriteria
      };
    }

    // Format the response
    const contacts = filteredContacts.map(contact => ({
      id: contact.id,
      firstName: contact.data.firstName || '',
      lastName: contact.data.lastName || '',
      email: contact.data.email || '',
      phone: contact.data.phone || '',
      company: contact.data.company || '',
      address: contact.data.address || '',
      businessSector: contact.data.businessSector || '',
      linkedin: contact.data.linkedin || '',
      notes: contact.data.notes || ''
    }));

    return {
      success: true,
      message: `Found ${contacts.length} contact${contacts.length !== 1 ? 's' : ''} matching "${filterCriteria}"`,
      action: 'filter_contacts',
      data: {
        contacts: contacts,
        searchField: searchField,
        filterCriteria: filterCriteria,
        totalFound: contacts.length
      },
      searchField: searchField,
      filterCriteria: filterCriteria,
      contactsFound: contacts.length
    };

  } catch (error) {
    logger.error('❌ Error in contact filtering:', error);
    return {
      success: false,
      error: 'Failed to process contact filtering request',
      details: 'Contact filtering processing failed'
    };
  }
}

// Handle task creation
async function handleTaskCreation(extractedData, originalCommand) {
  try {
    logger.info('🔧 Starting task creation with data:', extractedData);
    
    const { taskType, contactIdentifier, listingIdentifier, taskTitle, taskDescription, dueDate, priority = 'medium', status = 'pending' } = extractedData;
    
    // Validate required fields
    if (!taskDescription) {
      return {
        success: false,
        error: 'Task description is required',
        details: 'No task description provided'
      };
    }
    
    if (!dueDate) {
      return {
        success: false,
        error: 'Due date is required',
        details: 'No due date specified for the task'
      };
    }
    
    let taskData = {
      title: taskTitle || taskDescription,
      description: taskDescription,
      dueDate: dueDate,
      priority: priority,
      status: status,
      contactId: null,
      listingId: null,
      prospectId: null,
      prospectBusinessId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    let result = {};
    
    if (taskType === 'contact') {
      // Handle contact task
      if (!contactIdentifier) {
        return {
          success: false,
          error: 'Contact identifier is required',
          details: 'No contact specified in the task creation request'
        };
      }
      
      logger.info('🔍 Looking for contact:', contactIdentifier);
      const contactResult = await findContact(contactIdentifier);
      
      if (!contactResult) {
        return {
          success: false,
          error: 'Contact not found',
          details: `Could not find contact: ${contactIdentifier}`,
          suggestion: 'Please check the contact name, email, or company and try again.'
        };
      }
      
      logger.info('✅ Found contact:', contactResult);
      
      // Extract contact data from the result
      const contactData = contactResult.data;
      const contactId = contactResult.id;
      
      // Update task data with contact info
      taskData.contactId = contactId;
      
      logger.info('🔧 Creating contact task with data:', taskData);
      
      // Add task to Firestore
      const taskRef = await db.collection('tasks').add(taskData);
      
      logger.info('✅ Contact task created successfully with ID:', taskRef.id);
      
      // Log the action
      await logTaskAction(originalCommand, 'create_task', taskRef.id, taskData, contactData);
      
      result = {
        success: true,
        message: `Task created successfully for ${contactData.firstName} ${contactData.lastName}`,
        taskId: taskRef.id,
        task: {
          ...taskData,
          id: taskRef.id
        },
        contact: {
          id: contactId,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          company: contactData.company
        }
      };
      
    } else if (taskType === 'listing') {
      // Handle listing task
      if (!listingIdentifier) {
        return {
          success: false,
          error: 'Listing identifier is required',
          details: 'No listing specified in the task creation request'
        };
      }
      
      logger.info('🔍 Looking for listing:', listingIdentifier);
      const listingResult = await findListing(listingIdentifier);
      
      if (!listingResult) {
        return {
          success: false,
          error: 'Listing not found',
          details: `Could not find listing: ${listingIdentifier}`,
          suggestion: 'Please check the listing address and try again.'
        };
      }
      
      logger.info('✅ Found listing:', listingResult);
      
      // Extract listing data from the result
      const listingData = listingResult.data;
      const listingId = listingResult.id;
      
      // Update task data with listing info
      taskData.listingId = listingId;
      
      logger.info('🔧 Creating listing task with data:', taskData);
      
      // Add task to Firestore
      const taskRef = await db.collection('tasks').add(taskData);
      
      logger.info('✅ Listing task created successfully with ID:', taskRef.id);
      
      // Log the action
      await logListingTaskAction(originalCommand, 'create_task', taskRef.id, taskData, listingData);
      
      result = {
        success: true,
        message: `Task created successfully for listing: ${listingData.streetAddress || listingData.address || listingData.name || 'Unknown Listing'}`,
        taskId: taskRef.id,
        task: {
          ...taskData,
          id: taskRef.id
        },
        listing: {
          id: listingId,
          streetAddress: listingData.streetAddress,
          address: listingData.address,
          name: listingData.name,
          title: listingData.title
        }
      };
      
    } else {
      return {
        success: false,
        error: 'Invalid task type',
        details: 'Task type must be either "contact" or "listing"'
      };
    }
    
    return result;
    
  } catch (error) {
    logger.error('❌ Error in handleTaskCreation:', error);
    return {
      success: false,
      error: 'Failed to create task',
      details: error.message
    };
  }
}

// Helper function to log task actions
async function logTaskAction(command, action, taskId, taskData, contact) {
  try {
    await db.collection('ai_task_actions').add({
      command: command,
      action: action,
      taskId: taskId,
      taskTitle: taskData.title,
      contactId: contact.id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      dueDate: taskData.dueDate,
      priority: taskData.priority,
      timestamp: new Date(),
      success: true
    });
  } catch (error) {
    logger.error('Failed to log task action:', error);
  }
}

// Helper function to log listing task actions
async function logListingTaskAction(command, action, taskId, taskData, listing) {
  try {
    await db.collection('ai_task_actions').add({
      command: command,
      action: action,
      taskId: taskId,
      taskTitle: taskData.title,
      listingId: listing.id,
      listingName: listing.streetAddress || listing.address || listing.name || 'Unknown Listing',
      dueDate: taskData.dueDate,
      priority: taskData.priority,
      timestamp: new Date(),
      success: true
    });
  } catch (error) {
    logger.error('Failed to log listing task action:', error);
  }
}

// Helper function to handle general queries
async function handleGeneralQuery(originalCommand) {
  // Use the regular chat endpoint for general queries
  try {
    const apiKey = openaiApiSecret.value();
    const openai = new OpenAI({
      apiKey: apiKey,
    });

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
    logger.error('❌ Error in general query:', error);
    return {
      success: false,
      error: 'Failed to process your question. Please try again.',
      details: 'General query processing failed'
    };
  }
}

// Helper function to query contacts by criteria
async function queryContactsByCriteria(criteria) {
  const contactsRef = db.collection('contacts');
  let query = contactsRef;

  logger.info('🔍 Query Contacts Criteria:', criteria);

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

  logger.info(`🔍 Found ${contacts.length} total contacts`);

  // Apply search terms filter if specified
  if (criteria.searchTerms) {
    const searchTerms = criteria.searchTerms.toLowerCase();
    logger.info(`🔍 Filtering by search terms: "${searchTerms}"`);
    
    contacts = contacts.filter(contact => {
      const data = contact.data;
      const matches = (
        (data.firstName && data.firstName.toLowerCase().includes(searchTerms)) ||
        (data.lastName && data.lastName.toLowerCase().includes(searchTerms)) ||
        (data.email && data.email.toLowerCase().includes(searchTerms)) ||
        (data.company && data.company.toLowerCase().includes(searchTerms)) ||
        (data.businessSector && data.businessSector.toLowerCase().includes(searchTerms)) ||
        (data.notes && data.notes.toLowerCase().includes(searchTerms))
      );
      
      if (matches) {
        logger.info(`🔍 Contact matches: ${data.firstName} ${data.lastName} - businessSector: "${data.businessSector}"`);
      }
      
      return matches;
    });
    
    logger.info(`🔍 After filtering: ${contacts.length} contacts match`);
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
      timestamp: FieldValue.serverTimestamp(),
      success: true
    });
  } catch (error) {
    logger.error('Failed to log list action:', error);
  }
}

// Activities Firebase Functions

// Create a new activity
export const createActivity = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const activityData = req.body;

    // Validate required fields
    if (!activityData.type || !activityData.description) {
      return res.status(400).json({
        error: 'Missing required fields: type and description'
      });
    }

    // Add timestamp
    activityData.createdAt = FieldValue.serverTimestamp();
    activityData.updatedAt = FieldValue.serverTimestamp();

    // Add listing connection if requested
    if (activityData.connectToListing && activityData.selectedListing) {
      activityData.listingId = activityData.selectedListing.id;
      activityData.listingName = (() => {
        if (activityData.selectedListing.name && activityData.selectedListing.name.trim()) {
          return activityData.selectedListing.name;
        } else if (activityData.selectedListing.address && activityData.selectedListing.address.trim()) {
          return activityData.selectedListing.address;
        } else if (activityData.selectedListing.streetAddress && activityData.selectedListing.streetAddress.trim()) {
          return activityData.selectedListing.streetAddress;
        } else if (activityData.selectedListing.title && activityData.selectedListing.title.trim()) {
          return activityData.selectedListing.title;
        } else {
          return `Listing ${activityData.selectedListing.id.slice(-6)}`;
        }
      })();
    }

    logger.info('📝 Creating new activity:', { 
      type: activityData.type, 
      contactId: activityData.contactId,
      connectToListing: activityData.connectToListing,
      selectedListing: activityData.selectedListing,
      listingId: activityData.listingId || null
    });

    // Save to Firestore
    const activityRef = await db.collection('activities').add(activityData);
    
    logger.info('✅ Activity created successfully:', activityRef.id);

    res.json({
      success: true,
      activityId: activityRef.id,
      message: 'Activity created successfully'
    });

  } catch (error) {
    logger.error('❌ Error creating activity:', error);
    res.status(500).json({
      error: 'Failed to create activity',
      details: error.message
    });
  }
});

// Get all activities with optional filtering
export const getActivities = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    const { type, limit, offset } = req.query;
    
    logger.info('📋 Fetching activities with filters:', { type, limit, offset });

    let query = db.collection('activities').orderBy('date', 'desc');

    // Apply filters
    if (type) {
      query = query.where('type', '==', type);
    }

    // Apply pagination
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    if (offset) {
      query = query.offset(parseInt(offset));
    }

    const querySnapshot = await query.get();
    
    const activities = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info(`✅ Successfully fetched ${activities.length} activities`);

    res.json({
      success: true,
      activities: activities
    });

  } catch (error) {
    logger.error('❌ Error fetching activities:', error);
    res.status(500).json({
      error: 'Failed to fetch activities',
      details: error.message
    });
  }
});

// Get activities for a specific contact
export const getContactActivities = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    const contactId = req.path.split('/').pop(); // Get contactId from URL path
    
    if (!contactId) {
      return res.status(400).json({
        error: 'Contact ID is required'
      });
    }

    logger.info('📋 Fetching activities for contact:', contactId);

    const querySnapshot = await db.collection('activities')
      .where('contactId', '==', contactId)
      .orderBy('date', 'desc')
      .get();

    const activities = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info(`✅ Successfully fetched ${activities.length} activities for contact ${contactId}`);

    res.json({
      success: true,
      activities: activities
    });

  } catch (error) {
    logger.error('❌ Error fetching contact activities:', error);
    res.status(500).json({
      error: 'Failed to fetch contact activities',
      details: error.message
    });
  }
});

// Update an activity
export const updateActivity = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow PUT requests
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed. Use PUT.' });
    return;
  }

  try {
    const activityId = req.path.split('/').pop(); // Get activityId from URL path
    const updateData = req.body;

    if (!activityId) {
      return res.status(400).json({
        error: 'Activity ID is required'
      });
    }

    // Add updated timestamp
    updateData.updatedAt = FieldValue.serverTimestamp();

    logger.info('📝 Updating activity:', activityId);

    // Update in Firestore
    await db.collection('activities').doc(activityId).update(updateData);
    
    logger.info('✅ Activity updated successfully:', activityId);

    res.json({
      success: true,
      message: 'Activity updated successfully'
    });

  } catch (error) {
    logger.error('❌ Error updating activity:', error);
    res.status(500).json({
      error: 'Failed to update activity',
      details: error.message
    });
  }
});

// Delete an activity
export const deleteActivity = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed. Use DELETE.' });
    return;
  }

  try {
    const activityId = req.path.split('/').pop(); // Get activityId from URL path

    if (!activityId) {
      return res.status(400).json({
        error: 'Activity ID is required'
      });
    }

    logger.info('🗑️ Deleting activity:', activityId);

    // Delete from Firestore
    await db.collection('activities').doc(activityId).delete();
    
    logger.info('✅ Activity deleted successfully:', activityId);

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });

  } catch (error) {
    logger.error('❌ Error deleting activity:', error);
    res.status(500).json({
      error: 'Failed to delete activity',
      details: error.message
    });
  }
});

export const helloWorld = onRequest(
  { memory: "256MiB" },
  (req, res) => {
    res.send("Hello from Firebase!");
  }
);

// Prospect Businesses Function
export const prospectBusinesses = onRequest(
  { secrets: [openaiApiSecret, googleApiSecret] },
  async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const { businessCategory, location } = req.body;

    // Validate input
    if (!businessCategory || !location) {
      return res.status(400).json({
        error: 'Both businessCategory and location are required'
      });
    }

    logger.info('🔍 Prospect Businesses Request:', { businessCategory, location });

    // Get API keys
    const openaiApiKey = openaiApiSecret.value();
    const googleApiKey = googleApiSecret.value();

    if (!openaiApiKey) {
      logger.error('❌ OpenAI API key not configured');
      return res.status(500).json({
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY.'
      });
    }

    if (!googleApiKey) {
      logger.error('❌ Google API key not configured. Please set google.key in Firebase Functions Config');
      return res.status(500).json({
        error: 'Google API key not configured. Please set google.key in Firebase Functions Config.'
      });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Step 1: Expand business category using OpenAI
    logger.info('🧠 Step 1: Expanding business category with OpenAI');
    const expansionPrompt = `
Given the business category "${businessCategory}", generate 6-10 related search terms that would help find similar businesses.
Focus on variations, synonyms, and related business types that would appear in Google Places.

For example, if the category is "dentist", include terms like:
- dentist
- dental office
- dental clinic
- orthodontist
- dental practice
- oral surgeon
- endodontist
- periodontist
- family dentist
- cosmetic dentist

Return ONLY a JSON array of strings, no other text:
["term1", "term2", "term3", ...]
`;

    const expansionCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: expansionPrompt }],
      max_tokens: 200,
      temperature: 0.3,
    });

    const expansionResponse = expansionCompletion.choices[0]?.message?.content || '';
    let searchTerms;
    
    try {
      searchTerms = JSON.parse(expansionResponse);
      logger.info('✅ Expanded search terms:', searchTerms);
    } catch (parseError) {
      logger.error('❌ Failed to parse OpenAI response:', expansionResponse);
      return res.status(500).json({
        error: 'Failed to expand business category',
        details: 'OpenAI response parsing failed'
      });
    }

    // Step 2: Geocode the location
    logger.info('🗺️ Step 2: Geocoding location');
    const geocodeLocation = location.includes(', PA') ? location : `${location}, PA`;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(geocodeLocation)}&key=${googleApiKey}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    logger.info('🔍 Geocoding response:', geocodeData);

    if (geocodeData.status !== 'OK' || !geocodeData.results[0]) {
      logger.error('❌ Geocoding failed:', geocodeData.status, geocodeData.error_message);
      return res.status(400).json({
        error: 'Location not found',
        details: `Could not find coordinates for: ${location}`,
        googleStatus: geocodeData.status,
        googleError: geocodeData.error_message
      });
    }

    const { lat, lng } = geocodeData.results[0].geometry.location;
    logger.info('✅ Geocoded location:', { lat, lng, address: geocodeData.results[0].formatted_address });

    // Step 3: Search for businesses using each term
    logger.info('🏢 Step 3: Searching for businesses');
    const allBusinesses = new Map(); // Use Map to deduplicate by place_id

    for (const searchTerm of searchTerms) {
      try {
        logger.info(`🔍 Searching for: ${searchTerm}`);
        
        // Google Places Nearby Search
                  const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3219&keyword=${encodeURIComponent(searchTerm)}&key=${googleApiKey}`;
        
        const nearbyResponse = await fetch(nearbyUrl);
        const nearbyData = await nearbyResponse.json();

        logger.info(`🔍 Nearby search response for ${searchTerm}:`, nearbyData);

        if (nearbyData.status === 'OK' && nearbyData.results) {
          logger.info(`✅ Found ${nearbyData.results.length} results for ${searchTerm}`);
          
          // Get detailed information for each place
          for (const place of nearbyData.results) {
            if (!allBusinesses.has(place.place_id)) {
              try {
                // Google Place Details API
                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,formatted_phone_number,website,geometry&key=${googleApiKey}`;
                
                const detailsResponse = await fetch(detailsUrl);
                const detailsData = await detailsResponse.json();

                if (detailsData.status === 'OK' && detailsData.result) {
                  const business = {
                    place_id: place.place_id,
                    name: detailsData.result.name || place.name,
                    address: detailsData.result.formatted_address || place.vicinity,
                    rating: detailsData.result.rating || place.rating || null,
                    phone: detailsData.result.formatted_phone_number || null,
                    website: detailsData.result.website || null,
                    coordinates: detailsData.result.geometry?.location || place.geometry?.location,
                    search_term: searchTerm
                  };

                  allBusinesses.set(place.place_id, business);
                  logger.info(`✅ Added business: ${business.name}`);
                }
              } catch (detailsError) {
                logger.error(`❌ Error getting details for ${place.place_id}:`, detailsError);
              }
            }
          }
        } else {
          logger.warn(`⚠️ No results for search term: ${searchTerm}. Status: ${nearbyData.status}, Error: ${nearbyData.error_message}`);
        }

        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (searchError) {
        logger.error(`❌ Error searching for ${searchTerm}:`, searchError);
      }
    }

    // Convert Map to array
    const businesses = Array.from(allBusinesses.values());
    
    logger.info(`✅ Prospect search complete. Found ${businesses.length} unique businesses.`);

    // Save search to Firestore for tracking
    try {
      const searchData = {
        businessCategory,
        location,
        searchTerms,
        coordinates: { lat, lng },
        resultsCount: businesses.length,
        businessesFound: businesses.length,
        businesses: businesses, // Store the actual business results
        timestamp: FieldValue.serverTimestamp(),
        searchTermsUsed: searchTerms
      };

      await db.collection('prospectSearches').add(searchData);
      logger.info('✅ Prospect search saved to Firestore with business results');
    } catch (firestoreError) {
      logger.error('❌ Error saving to Firestore:', firestoreError);
      // Don't fail the request if Firestore save fails
    }

    res.json({
      success: true,
      message: `Found ${businesses.length} businesses for ${businessCategory} in ${location}`,
      data: {
        searchLocation: geocodeData.results[0].formatted_address,
        coordinates: { lat, lng },
        searchTerms,
        businesses
      }
    });

  } catch (error) {
    logger.error('❌ Error in prospectBusinesses function:', error);
    res.status(500).json({
      error: 'Failed to search for businesses',
      details: error.message
    });
  }
});

// Scheduled function to delete old prospect searches (30+ days old)
export const cleanupOldProspects = onSchedule({
  schedule: "0 2 * * *", // Run daily at 2 AM
  timeZone: "America/New_York"
}, async (event) => {
  try {
    logger.info('🧹 Starting cleanup of old prospect searches...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Query for documents older than 30 days
    const snapshot = await db.collection('prospectSearches')
      .where('timestamp', '<', thirtyDaysAgo)
      .get();
    
    if (snapshot.empty) {
      logger.info('✅ No old prospect searches to delete');
      return;
    }
    
    logger.info(`📊 Found ${snapshot.size} old prospect searches to delete`);
    
    // Delete old documents
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      logger.info(`🗑️ Marking for deletion: ${doc.id} (${doc.data().businessCategory} in ${doc.data().location})`);
    });
    
    await batch.commit();
    
    logger.info(`✅ Successfully deleted ${snapshot.size} old prospect searches`);
    
  } catch (error) {
    logger.error('❌ Error in cleanupOldProspects:', error);
  }
});
