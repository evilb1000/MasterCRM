const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./secrets/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkActivities() {
  try {
    console.log('🔍 Checking all activities in Firestore...\n');
    
    const activitiesRef = db.collection('activities');
    const snapshot = await activitiesRef.get();
    
    if (snapshot.empty) {
      console.log('❌ No activities found in the collection');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} activities total\n`);
    
    let missingListingId = 0;
    let hasListingId = 0;
    let activitiesWithListingId = [];
    let activitiesWithoutListingId = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const activityId = doc.id;
      
      if (data.listingId) {
        hasListingId++;
        activitiesWithListingId.push({
          id: activityId,
          listingId: data.listingId,
          listingName: data.listingName || 'No name',
          type: data.type,
          description: data.description,
          contactId: data.contactId
        });
      } else {
        missingListingId++;
        activitiesWithoutListingId.push({
          id: activityId,
          type: data.type,
          description: data.description,
          contactId: data.contactId,
          fields: Object.keys(data)
        });
      }
    });
    
    console.log(`✅ Activities WITH listingId: ${hasListingId}`);
    console.log(`❌ Activities MISSING listingId: ${missingListingId}\n`);
    
    if (activitiesWithListingId.length > 0) {
      console.log('📋 Activities WITH listingId:');
      activitiesWithListingId.forEach(activity => {
        console.log(`  - ID: ${activity.id}`);
        console.log(`    Listing ID: ${activity.listingId}`);
        console.log(`    Listing Name: ${activity.listingName}`);
        console.log(`    Type: ${activity.type}`);
        console.log(`    Description: ${activity.description}`);
        console.log(`    Contact ID: ${activity.contactId}`);
        console.log('');
      });
    }
    
    if (activitiesWithoutListingId.length > 0) {
      console.log('⚠️  Activities MISSING listingId:');
      activitiesWithoutListingId.forEach(activity => {
        console.log(`  - ID: ${activity.id}`);
        console.log(`    Type: ${activity.type}`);
        console.log(`    Description: ${activity.description}`);
        console.log(`    Contact ID: ${activity.contactId}`);
        console.log(`    Available fields: ${activity.fields.join(', ')}`);
        console.log('');
      });
    }
    
    // Also check if there are any activities with empty/null listingId
    let emptyListingId = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.listingId === null || data.listingId === undefined || data.listingId === '') {
        emptyListingId++;
      }
    });
    
    if (emptyListingId > 0) {
      console.log(`⚠️  Activities with empty/null listingId: ${emptyListingId}`);
    }
    
    console.log('\n🎯 Summary:');
    console.log(`Total activities: ${snapshot.size}`);
    console.log(`With listingId: ${hasListingId}`);
    console.log(`Missing listingId: ${missingListingId}`);
    console.log(`Empty listingId: ${emptyListingId}`);
    
  } catch (error) {
    console.error('❌ Error checking activities:', error);
  } finally {
    process.exit(0);
  }
}

checkActivities(); 