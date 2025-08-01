const functions = require('firebase-functions');

// Set environment variable to indicate we're in Firebase Functions
process.env.FIREBASE_FUNCTIONS = 'true';

const app = require('./server');

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app); 