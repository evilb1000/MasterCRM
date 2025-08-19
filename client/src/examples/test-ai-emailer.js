// Test file for AI Emailer functionality
// This file can be run in the browser console to test the AI email service

import { isEmailCommand, processEmailCommand } from '../services/aiEmailer.js';

// Test the email command detection
console.log('Testing email command detection:');
console.log('Input: "EMAIL JIM MARTIN ABOUT PROPERTY SHOWING"');
console.log('Output:', isEmailCommand('EMAIL JIM MARTIN ABOUT PROPERTY SHOWING'));

console.log('Input: "send email to john@example.com regarding contract"');
console.log('Output:', isEmailCommand('send email to john@example.com regarding contract'));

console.log('Input: "write email for sarah about meeting"');
console.log('Output:', isEmailCommand('write email for sarah about meeting'));

console.log('Input: "compose email to client concerning offer"');
console.log('Output:', isEmailCommand('compose email to client concerning offer'));

console.log('Input: "contact jim via email about follow up"');
console.log('Output:', isEmailCommand('contact jim via email about follow up'));

console.log('Input: "reach out to sarah via email about property"');
console.log('Output:', isEmailCommand('reach out to sarah via email about property'));

console.log('Input: "follow up with mike via email about showing"');
console.log('Output:', isEmailCommand('follow up with mike via email about showing'));

// Test non-email commands
console.log('\nTesting non-email commands:');
console.log('Input: "create contact for John Smith"');
console.log('Output:', isEmailCommand('create contact for John Smith'));

console.log('Input: "show me my contacts"');
console.log('Output:', isEmailCommand('show me my contacts'));

console.log('Input: "log call with client"');
console.log('Output:', isEmailCommand('log call with client'));

// Test the service methods (these will fail without real tokens, but good for syntax checking)
console.log('\nTesting AI Email service methods:');
console.log('isEmailCommand:', typeof isEmailCommand);
console.log('processEmailCommand:', typeof processEmailCommand);

// Test error handling
console.log('\nTesting error handling:');
try {
  processEmailCommand('');
} catch (error) {
  console.log('Expected error caught:', error.message);
}

console.log('\nAI Emailer test completed successfully!');
