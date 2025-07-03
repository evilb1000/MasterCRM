const { db } = require('../firebase');

// Example Firestore operations

// 1. Create/Update a document
async function createUser(userId, userData) {
  try {
    await db.collection('users').doc(userId).set(userData);
    console.log('✅ User created successfully');
  } catch (error) {
    console.error('❌ Error creating user:', error);
  }
}

// 2. Read a document
async function getUser(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (doc.exists) {
      console.log('✅ User data:', doc.data());
      return doc.data();
    } else {
      console.log('❌ User not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return null;
  }
}

// 3. Update a document
async function updateUser(userId, updates) {
  try {
    await db.collection('users').doc(userId).update(updates);
    console.log('✅ User updated successfully');
  } catch (error) {
    console.error('❌ Error updating user:', error);
  }
}

// 4. Delete a document
async function deleteUser(userId) {
  try {
    await db.collection('users').doc(userId).delete();
    console.log('✅ User deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting user:', error);
  }
}

// 5. Query documents
async function getUsersByAge(age) {
  try {
    const snapshot = await db.collection('users')
      .where('age', '==', age)
      .get();
    
    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ Found ${users.length} users with age ${age}`);
    return users;
  } catch (error) {
    console.error('❌ Error querying users:', error);
    return [];
  }
}

// 6. Add a document with auto-generated ID
async function addMessage(messageData) {
  try {
    const docRef = await db.collection('messages').add(messageData);
    console.log('✅ Message added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding message:', error);
    return null;
  }
}

// 7. Batch operations
async function batchOperations() {
  try {
    const batch = db.batch();
    
    // Add multiple operations to the batch
    const user1Ref = db.collection('users').doc('user1');
    batch.set(user1Ref, { name: 'John', age: 30 });
    
    const user2Ref = db.collection('users').doc('user2');
    batch.set(user2Ref, { name: 'Jane', age: 25 });
    
    const messageRef = db.collection('messages').doc('msg1');
    batch.update(messageRef, { read: true });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Batch operations completed successfully');
  } catch (error) {
    console.error('❌ Error in batch operations:', error);
  }
}

// Export functions for use in other files
module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getUsersByAge,
  addMessage,
  batchOperations
};

// Example usage (uncomment to test):
/*
createUser('user123', {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  createdAt: new Date()
});

getUser('user123');

updateUser('user123', {
  age: 31,
  lastUpdated: new Date()
});
*/ 