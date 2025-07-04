/**
 * Test Examples for AI List Creation Integration
 * 
 * This file contains example commands you can test in the ChatBox
 * to verify the AI List Creation integration is working correctly.
 */

// Example List Creation Commands
const listCreationExamples = [
  "Create a list of tech companies",
  "Make a list of contacts with LinkedIn profiles",
  "Build a list of people from Google",
  "Generate a list of contacts in the finance sector",
  "Show me all contacts with email addresses",
  "Find all contacts from healthcare companies",
  "Create a list of contacts with notes",
  "Make a list of people in the education industry",
  "Build a list of contacts without LinkedIn profiles",
  "Generate a list of contacts from Apple",
  "Show me all tech contacts",
  "Find all contacts in the marketing sector",
  "Create a list of contacts with phone numbers",
  "Make a list of people from Microsoft",
  "Build a list of contacts in the consulting business"
];

// Example Complex List Creation Commands
const complexListExamples = [
  "Create a list of tech companies with LinkedIn profiles",
  "Make a list of finance contacts with notes",
  "Build a list of healthcare companies with email addresses",
  "Generate a list of education contacts without LinkedIn",
  "Show me all tech contacts with phone numbers"
];

// Example Natural Language Commands
const naturalLanguageExamples = [
  "I need a list of all my tech contacts",
  "Can you find everyone who works at Google?",
  "Show me people who have LinkedIn profiles",
  "Get me all contacts in the finance industry",
  "I want to see contacts that have notes",
  "Find all my healthcare industry contacts",
  "List everyone from Apple",
  "Show contacts without email addresses",
  "Get me all education sector contacts",
  "Find people who work at Microsoft"
];

// Test Function to Log Examples
export function logListCreationExamples() {
  console.log('=== AI List Creation Test Examples ===');
  
  console.log('\n📋 Basic List Creation Commands:');
  listCreationExamples.forEach((example, index) => {
    console.log(`${index + 1}. "${example}"`);
  });
  
  console.log('\n🔍 Complex List Creation Commands:');
  complexListExamples.forEach((example, index) => {
    console.log(`${index + 1}. "${example}"`);
  });
  
  console.log('\n💬 Natural Language Commands:');
  naturalLanguageExamples.forEach((example, index) => {
    console.log(`${index + 1}. "${example}"`);
  });
  
  console.log('\n💡 Tips:');
  console.log('- Make sure your backend server is running on localhost:3001');
  console.log('- Try different types of criteria: company, sector, LinkedIn, notes, etc.');
  console.log('- Check the response for list details and contact information');
  console.log('- Look for the "AI List Creation" badge to confirm the endpoint was used');
  console.log('- Lists are automatically saved to Firestore and can be viewed in the Listings page');
}

// Export examples for use in other components
export {
  listCreationExamples,
  complexListExamples,
  naturalLanguageExamples
}; 