/**
 * Test Examples for AI Contact Actions Integration
 * 
 * This file contains example commands you can test in the ChatBox
 * to verify the AI Contact Actions integration is working correctly.
 */

// Example Contact Update Commands
const contactUpdateExamples = [
  "update John Smith's phone number to 555-1234",
  "change Jane Doe's email to jane@example.com", 
  "set John's company to Acme Corp",
  "modify Sarah Wilson's address to 123 Main St, City, State",
  "edit contact Mike Johnson's business sector to Technology"
];

// Example Contact Deletion Commands
const contactDeletionExamples = [
  "delete John Smith's phone number",
  "remove contact John Smith",
  "delete Jane Doe's email address",
  "remove Mike Johnson from contacts"
];

// Example General Query Commands
const generalQueryExamples = [
  "how do I use this CRM system?",
  "what fields can I update for contacts?",
  "show me all available contact fields",
  "what contact actions are available?",
  "help me understand the contact management features"
];

// Example Contact Creation Commands
const contactCreationExamples = [
  "add new contact John Smith with phone 555-1234 and email john@example.com",
  "create contact Jane Doe with company Acme Corp",
  "new contact Mike Johnson, phone 555-5678, email mike@example.com"
];

// Test Function to Log Examples
export function logTestExamples() {
  console.log('=== AI Contact Actions Test Examples ===');
  
  console.log('\n📝 Contact Update Commands:');
  contactUpdateExamples.forEach((example, index) => {
    console.log(`${index + 1}. "${example}"`);
  });
  
  console.log('\n🗑️ Contact Deletion Commands:');
  contactDeletionExamples.forEach((example, index) => {
    console.log(`${index + 1}. "${example}"`);
  });
  
  console.log('\n❓ General Query Commands:');
  generalQueryExamples.forEach((example, index) => {
    console.log(`${index + 1}. "${example}"`);
  });
  
  console.log('\n➕ Contact Creation Commands:');
  contactCreationExamples.forEach((example, index) => {
    console.log(`${index + 1}. "${example}"`);
  });
  
  console.log('\n💡 Tips:');
  console.log('- Make sure your backend server is running on localhost:3001');
  console.log('- Try both contact action commands and regular chat messages');
  console.log('- Check the response type badge to confirm which endpoint was used');
  console.log('- Look for the "AI Contact Management" badge for contact actions');
}

// Export examples for use in other components
export {
  contactUpdateExamples,
  contactDeletionExamples,
  generalQueryExamples,
  contactCreationExamples
}; 