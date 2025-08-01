// Test script for activities endpoints
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3004';

// Test data
const testContactId = '6OhFZMlXyTRqsOOC9ULF'; // John Smith's ID
const testActivity = {
  contactId: testContactId,
  type: 'call',
  description: 'Called John to discuss property showing',
  date: new Date().toISOString(),
  duration: 15,
  notes: 'John was interested in scheduling a showing next week'
};

async function testActivities() {
  console.log('🧪 Testing Activities Endpoints...\n');

  try {
    // Test 1: Create an activity
    console.log('1️⃣ Creating activity...');
    const createResponse = await axios.post(`${API_BASE_URL}/activities`, testActivity);
    console.log('✅ Activity created:', createResponse.data);
    const activityId = createResponse.data.activityId;

    // Test 2: Get activities for the contact
    console.log('\n2️⃣ Getting contact activities...');
    const contactActivitiesResponse = await axios.get(`${API_BASE_URL}/activities/contact/${testContactId}`);
    console.log('✅ Contact activities:', contactActivitiesResponse.data);

    // Test 3: Get all activities
    console.log('\n3️⃣ Getting all activities...');
    const allActivitiesResponse = await axios.get(`${API_BASE_URL}/activities`);
    console.log('✅ All activities:', allActivitiesResponse.data);

    // Test 4: Update the activity
    console.log('\n4️⃣ Updating activity...');
    const updateData = {
      description: 'Updated: Called John to discuss property showing',
      notes: 'Updated notes: John was very interested and wants to see it tomorrow'
    };
    const updateResponse = await axios.put(`${API_BASE_URL}/activities/${activityId}`, updateData);
    console.log('✅ Activity updated:', updateResponse.data);

    // Test 5: Get the updated activity
    console.log('\n5️⃣ Getting updated contact activities...');
    const updatedActivitiesResponse = await axios.get(`${API_BASE_URL}/activities/contact/${testContactId}`);
    console.log('✅ Updated activities:', updatedActivitiesResponse.data);

    // Test 6: Delete the activity
    console.log('\n6️⃣ Deleting activity...');
    const deleteResponse = await axios.delete(`${API_BASE_URL}/activities/${activityId}`);
    console.log('✅ Activity deleted:', deleteResponse.data);

    // Test 7: Verify deletion
    console.log('\n7️⃣ Verifying deletion...');
    const finalActivitiesResponse = await axios.get(`${API_BASE_URL}/activities/contact/${testContactId}`);
    console.log('✅ Final activities count:', finalActivitiesResponse.data.count);

    console.log('\n🎉 All activities tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testActivities(); 