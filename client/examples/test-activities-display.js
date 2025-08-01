// Test script for activities display
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3004';

async function testActivitiesDisplay() {
  console.log('🧪 Testing Activities Display...\n');

  try {
    // Test 1: Get activities for John Smith
    console.log('1️⃣ Fetching activities for John Smith...');
    const johnActivities = await axios.get(`${API_BASE_URL}/activities/contact/6OhFZMlXyTRqsOOC9ULF`);
    console.log('✅ John Smith activities:', johnActivities.data);
    
    // Test 2: Get activities for Elodie Wren
    console.log('\n2️⃣ Fetching activities for Elodie Wren...');
    const elodieActivities = await axios.get(`${API_BASE_URL}/activities/contact/1ai11Iu1Hlp70TbufX4s`);
    console.log('✅ Elodie Wren activities:', elodieActivities.data);
    
    // Test 3: Get all activities
    console.log('\n3️⃣ Fetching all activities...');
    const allActivities = await axios.get(`${API_BASE_URL}/activities`);
    console.log('✅ All activities:', allActivities.data);
    
  } catch (error) {
    console.error('❌ Error testing activities display:', error.response?.data || error.message);
  }
}

testActivitiesDisplay(); 