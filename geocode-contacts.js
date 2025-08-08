const admin = require('firebase-admin');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, 'server', 'secrets', 'serviceAccountKey.json');

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.log('📝 Make sure you have placed your serviceAccountKey.json file in the ./server/secrets folder');
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// Google API Key - you'll need to set this
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY environment variable not set!');
  console.log('Please set it with: export GOOGLE_API_KEY="your_google_api_key"');
  process.exit(1);
}

async function geocodeAddress(address) {
  try {
    console.log(`🗺️ Geocoding address: ${address}`);
    
    // Format address for geocoding (add PA if not present)
    const formattedAddress = address.includes(', PA') ? address : `${address}, PA`;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedAddress)}&key=${GOOGLE_API_KEY}`;
    
    return new Promise((resolve, reject) => {
      const url = new URL(geocodeUrl);
      
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET'
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            
            if (jsonData.status === 'OK' && jsonData.results[0]) {
              const { lat, lng } = jsonData.results[0].geometry.location;
              console.log(`✅ Geocoded successfully: ${lat}, ${lng}`);
              resolve({ lat, lng });
            } else {
              console.log(`⚠️ Geocoding failed for "${address}": ${jsonData.status} - ${jsonData.error_message || 'Unknown error'}`);
              resolve(null);
            }
          } catch (parseError) {
            console.error(`❌ Error parsing response for "${address}":`, parseError.message);
            resolve(null);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error(`❌ Error geocoding "${address}":`, error.message);
        resolve(null);
      });
      
      req.end();
    });
  } catch (error) {
    console.error(`❌ Error geocoding "${address}":`, error.message);
    return null;
  }
}

async function geocodeAllContacts() {
  try {
    console.log('🚀 Starting contact geocoding process...');
    
    // Get all contacts from Firestore
    const contactsRef = db.collection('contacts');
    const snapshot = await contactsRef.get();
    
    console.log(`📊 Found ${snapshot.docs.length} contacts to process`);
    
    let processed = 0;
    let geocoded = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const contactDoc of snapshot.docs) {
      const contact = contactDoc.data();
      const contactId = contactDoc.id;
      
      console.log(`\n👤 Processing contact: ${contact.firstName} ${contact.lastName} (${contactId})`);
      
      // Check if already has coordinates
      if (contact.latitude && contact.longitude) {
        console.log(`⏭️ Skipping - already has coordinates: ${contact.latitude}, ${contact.longitude}`);
        skipped++;
        continue;
      }
      
      // Check if has address
      if (!contact.address || !contact.address.trim()) {
        console.log(`⏭️ Skipping - no address`);
        skipped++;
        continue;
      }
      
      // Geocode the address
      const coordinates = await geocodeAddress(contact.address.trim());
      
      if (coordinates) {
        // Update the contact with coordinates
        const contactRef = db.collection('contacts').doc(contactId);
        await contactRef.update({
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          geocodedAt: new Date()
        });
        
        console.log(`✅ Updated contact with coordinates: ${coordinates.lat}, ${coordinates.lng}`);
        geocoded++;
      } else {
        console.log(`❌ Failed to geocode address: ${contact.address}`);
        failed++;
      }
      
      processed++;
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Progress update every 10 contacts
      if (processed % 10 === 0) {
        console.log(`\n📈 Progress: ${processed}/${snapshot.docs.length} processed`);
      }
    }
    
    console.log('\n🎉 Geocoding process complete!');
    console.log(`📊 Summary:`);
    console.log(`   Total contacts: ${snapshot.docs.length}`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Successfully geocoded: ${geocoded}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped (already geocoded): ${skipped}`);
    
  } catch (error) {
    console.error('❌ Error in geocoding process:', error);
  }
}

// Run the script
geocodeAllContacts()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 