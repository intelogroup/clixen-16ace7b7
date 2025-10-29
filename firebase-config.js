const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
let firebaseApp;

function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const serviceAccount = require('./backend/credentials/firebase-service-account.json');
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'clixen-cc7b5'
    });

    console.log('✅ Firebase initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error.message);
    throw error;
  }
}

// Get Firestore instance
function getFirestore() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

// Get Auth instance
function getAuth() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}

// Get Storage instance
function getStorage() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.storage();
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  getStorage,
  admin
};
