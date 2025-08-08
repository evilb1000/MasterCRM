const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'server', 'secrets', 'serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();

async function fixContact() {
  try {
    console.log('🔍 Searching for Dave Daquelente...');
    const contactsRef = db.collection('contacts');
    const snapshot = await contactsRef.where('firstName', '==', 'Dave').where('lastName', '==', 'Daquelente').get();
    
    console.log('📊 Found', snapshot.docs.length, 'contacts');
    
    if (!snapshot.empty) {
      const contactDoc = snapshot.docs[0];
      console.log('✅ Found contact:', contactDoc.data());
      
      await contactDoc.ref.update({
        latitude: 40.41958959999999,
        longitude: -80.06117669999999,
        geocodedAt: new Date()
      });
      console.log('✅ Contact updated with coordinates successfully!');
    } else {
      console.log('❌ Contact not found');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

fixContact(); 