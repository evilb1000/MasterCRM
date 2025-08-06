const admin = require('firebase-admin');
const serviceAccount = require('./secrets/serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function wipeProspectSearches() {
  try {
    console.log('🧹 Starting to wipe prospectSearches collection...');
    
    // Get all documents in the collection
    const snapshot = await db.collection('prospectSearches').get();
    
    if (snapshot.empty) {
      console.log('✅ Collection is already empty!');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} documents to delete...`);
    
    // Delete all documents
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`✅ Successfully deleted ${snapshot.size} documents from prospectSearches collection!`);
    
  } catch (error) {
    console.error('❌ Error wiping collection:', error);
  } finally {
    process.exit(0);
  }
}

wipeProspectSearches(); 