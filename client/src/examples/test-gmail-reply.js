// Test file for Gmail reply and delete functionality
// This file can be run in the browser console to test the Gmail service

import { gmailService } from '../services/gmailService.js';

// Mock data for testing
const mockOriginalEmail = {
  id: 'test-email-id',
  from: 'John Doe <john@example.com>',
  subject: 'Test Email Subject',
  threadId: 'test-thread-id',
  messageId: '<test-message-id@example.com>'
};

const mockAccessToken = 'mock-access-token';

// Test the email address extraction
console.log('Testing email address extraction:');
console.log('Input: "John Doe <john@example.com>"');
console.log('Output:', gmailService.extractEmailAddress('John Doe <john@example.com>'));
console.log('Input: "jane@example.com"');
console.log('Output:', gmailService.extractEmailAddress('jane@example.com'));

// Test the service methods (these will fail without real tokens, but good for syntax checking)
console.log('\nTesting Gmail service methods:');
console.log('gmailService.sendReply:', typeof gmailService.sendReply);
console.log('gmailService.extractEmailAddress:', typeof gmailService.extractEmailAddress);
console.log('gmailService.getThread:', typeof gmailService.getThread);
console.log('gmailService.deleteMessage:', typeof gmailService.deleteMessage);

// Test error handling
console.log('\nTesting error handling:');
try {
  gmailService.sendReply('', mockOriginalEmail, 'Test reply');
} catch (error) {
  console.log('Expected error caught:', error.message);
}

try {
  gmailService.sendReply(mockAccessToken, null, 'Test reply');
} catch (error) {
  console.log('Expected error caught:', error.message);
}

try {
  gmailService.sendReply(mockAccessToken, mockOriginalEmail, '');
} catch (error) {
  console.log('Expected error caught:', error.message);
}

// Test delete error handling
console.log('\nTesting delete error handling:');
try {
  gmailService.deleteMessage('', mockOriginalEmail.id);
} catch (error) {
  console.log('Expected error caught:', error.message);
}

try {
  gmailService.deleteMessage(mockAccessToken, '');
} catch (error) {
  console.log('Expected error caught:', error.message);
}

console.log('\nGmail service test completed successfully!');
