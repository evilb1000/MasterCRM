const functions = require('firebase-functions');

// Set environment variable to indicate we're in Firebase Functions
process.env.FIREBASE_FUNCTIONS = 'true';

// Export a simple test function first
exports.test = functions.https.onRequest((req, res) => {
  res.json({ message: 'Test function working!' });
});

// Export the main API function
const app = require('./server');
exports.api = functions.https.onRequest(app); 