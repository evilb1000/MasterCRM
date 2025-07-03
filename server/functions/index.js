/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";

// Initialize Firebase Admin SDK
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Define the secret
const openaiApiSecret = defineSecret("OPENAI_API_KEY");

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

export const helloWorld = onRequest(
  { memory: "256MiB" },
  (req, res) => {
    res.send("Hello from Firebase!");
  }
);
