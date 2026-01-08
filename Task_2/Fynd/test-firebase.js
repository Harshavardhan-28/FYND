// Test Firebase connection
// Run with: node test-firebase.js

const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

try {
  console.log('Testing Firebase connection...\n');
  
  // Check env vars
  console.log('1. Checking environment variables:');
  console.log('   FIREBASE_DATABASE_URL:', process.env.FIREBASE_DATABASE_URL || '❌ MISSING');
  console.log('   FIREBASE_SERVICE_ACCOUNT_KEY:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? '✅ Present' : '❌ MISSING');
  
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY || !process.env.FIREBASE_DATABASE_URL) {
    console.log('\n❌ Missing required environment variables!');
    process.exit(1);
  }
  
  // Parse service account
  console.log('\n2. Parsing service account key...');
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  console.log('   Project ID:', serviceAccount.project_id);
  
  // Initialize Firebase
  console.log('\n3. Initializing Firebase Admin...');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  
  const db = admin.database();
  console.log('   ✅ Firebase initialized');
  
  // Test database connection
  console.log('\n4. Testing database connection...');
  const testRef = db.ref('test');
  
  testRef.set({ 
    message: 'Connection test', 
    timestamp: Date.now() 
  })
    .then(() => {
      console.log('   ✅ Successfully wrote to database!');
      console.log('   Database URL:', process.env.FIREBASE_DATABASE_URL);
      console.log('\n✅ All tests passed! Your Firebase setup is correct.\n');
      process.exit(0);
    })
    .catch((error) => {
      console.log('   ❌ Failed to write to database!');
      console.log('   Error:', error.message);
      
      if (error.message.includes('404')) {
        console.log('\n🔥 SOLUTION: Your Realtime Database does not exist yet!');
        console.log('   1. Go to: https://console.firebase.google.com/project/fynd-78784/database');
        console.log('   2. Click "Create Database" under Realtime Database (NOT Firestore)');
        console.log('   3. Choose any location and start in Test Mode');
        console.log('   4. Run this test again\n');
      }
      
      process.exit(1);
    });
  
} catch (error) {
  console.log('\n❌ Error:', error.message);
  process.exit(1);
}
