const axios = require('axios');

// Test the AI task creation endpoint with listing tasks
async function testListingTaskCreation() {
  const endpoint = 'https://aicreatetask-obagwr34kq-uc.a.run.app';
  
  const testCommands = [
    "create a task for listing Iron City Drive tomorrow about taking photos",
    "add task for listing 123 Main St next Tuesday to create marketing material",
    "create task for listing 456 Oak Avenue August 22nd regarding property showing"
  ];
  
  console.log('🧪 Testing Listing Task Creation Backend...\n');
  
  for (let i = 0; i < testCommands.length; i++) {
    const command = testCommands[i];
    console.log(`\n📋 Test ${i + 1}: "${command}"`);
    console.log('─'.repeat(50));
    
    try {
      const response = await axios.post(endpoint, {
        command: command
      });
      
      console.log('✅ Response Status:', response.status);
      console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        console.log('🎉 SUCCESS: Task created successfully!');
        if (response.data.listing) {
          console.log(`📍 Listing: ${response.data.listing.streetAddress || response.data.listing.address || response.data.listing.name}`);
        }
        if (response.data.task) {
          console.log(`📝 Task: ${response.data.task.title}`);
          console.log(`📅 Due: ${response.data.task.dueDate}`);
        }
      } else {
        console.log('❌ FAILED:', response.data.error);
        if (response.data.details) {
          console.log('📋 Details:', response.data.details);
        }
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
      if (error.response) {
        console.log('📊 Error Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the test
testListingTaskCreation().catch(console.error); 