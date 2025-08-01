// Test script for AI activity creation
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3004';

async function testAIActivities() {
  console.log('🧪 Testing AI Activity Creation...\n');

  const testCommands = [
    "called John Smith about the property showing",
    "emailed john@example.com regarding the new listing",
    "met with Elodie Wren to discuss investment opportunities",
    "texted John Smith about tomorrow's meeting",
    "showed property to Elodie Wren"
  ];

  for (let i = 0; i < testCommands.length; i++) {
    const command = testCommands[i];
    console.log(`${i + 1}️⃣ Testing: "${command}"`);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/ai-contact-action`, {
        command: command
      });
      
      console.log('✅ Response:', response.data);
      console.log('');
      
      // Wait a moment between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
      console.log('');
    }
  }
}

// Run the test
testAIActivities(); 