import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import { Request, Response } from 'firebase-functions';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Firestore
const db = admin.firestore();

// Chat Cloud Function with Secret Manager
export const chat = functions
  .runWith({ secrets: ['OPENAI_API_KEY'] })
  .https.onRequest(async (req: Request, res: Response) => {
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

      // Get the API key from Secret Manager
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY secret.' 
        });
      }

      // Initialize OpenAI client
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
          message: message,
          reply: reply,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
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

    } catch (error: any) {
      console.error('Error in chat function:', error);
      
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