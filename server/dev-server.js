require('dotenv').config();
const app = require('./server');

const PORT = process.env.PORT || 3001;

console.log('🔧 Starting development server...');
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 PORT:', PORT);

try {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Chat endpoint available at http://localhost:${PORT}/chat`);
    console.log(`🤖 AI Contact Action endpoint available at http://localhost:${PORT}/ai-contact-action`);
    console.log(`📋 AI List Creation endpoint available at http://localhost:${PORT}/ai-create-list`);
    console.log(`🔑 OpenAI API key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🔥 Firebase Admin SDK ready for Firestore operations`);
    console.log('✅ Server startup complete!');
  });
} catch (error) {
  console.error('🚨 Error starting server:', error);
  console.error('🚨 Stack trace:', error.stack);
} 