// Test script for the AI Contact Action endpoint
// Run with: node examples/test-ai-endpoint.js

const BACKEND_URL = 'http://localhost:3001';

async function testAIContactAction(command) {
  try {
    console.log(`\n🤖 Testing: "${command}"`);
    console.log('─'.repeat(50));
    
    const response = await fetch(`${BACKEND_URL}/ai-contact-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log(`📝 Message: ${result.message}`);
      console.log(`🎯 Action: ${result.action}`);
      if (result.contactId) console.log(`👤 Contact ID: ${result.contactId}`);
      if (result.field) console.log(`📋 Field: ${result.field}`);
      if (result.value) console.log(`💾 Value: ${result.value}`);
    } else {
      console.log('❌ Error!');
      console.log(`🚨 Error: ${result.error}`);
      if (result.details) console.log(`🔍 Details: ${result.details}`);
      if (result.suggestion) console.log(`💡 Suggestion: ${result.suggestion}`);
    }
  } catch (error) {
    console.log('💥 Network Error!');
    console.log(`🚨 ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting AI Contact Action Tests');
  console.log('='.repeat(60));

  // Test 1: General query
  await testAIContactAction("how do I use this CRM system?");

  // Test 2: Contact update
  await testAIContactAction("update John Smith's phone number to 555-1234");

  // Test 3: Contact update with email
  await testAIContactAction("change john@example.com's email to john.doe@newcompany.com");

  // Test 4: Vague command (should get helpful suggestion)
  await testAIContactAction("do something with contacts");

  // Test 5: Delete field
  await testAIContactAction("delete John Smith's phone number");

  // Test 6: Another general query
  await testAIContactAction("what fields can I update for contacts?");

  console.log('\n🎉 All tests completed!');
}

// Run the tests
runTests().catch(console.error); 