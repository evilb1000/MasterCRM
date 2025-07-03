const admin = require('firebase-admin');
const path = require('path');

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, 'secrets', 'serviceAccountKey.json');

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    // Optional: Add your Firebase project ID if not in the service account
    // projectId: 'your-project-id'
  });

  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.log('📝 Make sure you have placed your serviceAccountKey.json file in the ./secrets folder');
}

// Export Firestore instance
const db = admin.firestore();

// Export admin for other Firebase services if needed
module.exports = {
  admin,
  db
}; 