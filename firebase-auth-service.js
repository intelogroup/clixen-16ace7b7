const { initializeFirebase, getAuth, getFirestore } = require('./firebase-config');

/**
 * Firebase Authentication Service
 * Handles user authentication and management with Firebase Auth
 */

const auth = getAuth();
const db = getFirestore();
const USERS_COLLECTION = 'users';

/**
 * Create a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} additionalData - Additional user data (name, etc.)
 * @returns {Promise<Object>} Created user
 */
async function createUser(email, password, additionalData = {}) {
  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
      displayName: additionalData.name || email.split('@')[0]
    });

    console.log(`✅ Created Firebase Auth user: ${userRecord.uid}`);

    // Create user profile in Firestore
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      photoURL: additionalData.photoURL || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      calendarSettings: {
        defaultDuration: 60, // minutes
        workingHours: {
          start: '09:00',
          end: '17:00'
        },
        timezone: additionalData.timezone || 'America/New_York'
      },
      preferences: {
        notifications: true,
        theme: 'light',
        ...additionalData.preferences
      }
    };

    await db.collection(USERS_COLLECTION).doc(userRecord.uid).set(userData);
    console.log(`✅ Created Firestore user profile: ${userRecord.uid}`);

    return { uid: userRecord.uid, ...userData };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Get user by UID
 * @param {string} uid - Firebase user UID
 * @returns {Promise<Object|null>} User data
 */
async function getUserByUid(uid) {
  try {
    // Get from Firestore
    const userDoc = await db.collection(USERS_COLLECTION).doc(uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    return { uid: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User data
 */
async function getUserByEmail(email) {
  try {
    // Get from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    
    // Get profile from Firestore
    const userDoc = await db.collection(USERS_COLLECTION).doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified
      };
    }

    return { uid: userDoc.id, ...userDoc.data() };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    console.error('Error getting user by email:', error);
    throw error;
  }
}

/**
 * Update user profile
 * @param {string} uid - User UID
 * @param {Object} updates - Data to update
 * @returns {Promise<void>}
 */
async function updateUser(uid, updates) {
  try {
    // Update Firestore profile
    await db.collection(USERS_COLLECTION).doc(uid).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });

    // Update Firebase Auth if needed
    const authUpdates = {};
    if (updates.displayName) authUpdates.displayName = updates.displayName;
    if (updates.photoURL) authUpdates.photoURL = updates.photoURL;
    if (updates.email) authUpdates.email = updates.email;

    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(uid, authUpdates);
    }

    console.log(`✅ Updated user: ${uid}`);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Delete user
 * @param {string} uid - User UID
 * @returns {Promise<void>}
 */
async function deleteUser(uid) {
  try {
    // Delete from Firestore
    await db.collection(USERS_COLLECTION).doc(uid).delete();
    
    // Delete from Firebase Auth
    await auth.deleteUser(uid);
    
    console.log(`✅ Deleted user: ${uid}`);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Verify ID token from client
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<Object>} Decoded token
 */
async function verifyIdToken(idToken) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
}

/**
 * Set custom claims for user (for roles/permissions)
 * @param {string} uid - User UID
 * @param {Object} claims - Custom claims to set
 * @returns {Promise<void>}
 */
async function setCustomClaims(uid, claims) {
  try {
    await auth.setCustomUserClaims(uid, claims);
    console.log(`✅ Set custom claims for user: ${uid}`, claims);
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw error;
  }
}

/**
 * List all users (with pagination)
 * @param {number} maxResults - Max results per page
 * @param {string} pageToken - Page token for pagination
 * @returns {Promise<Object>} Users and next page token
 */
async function listUsers(maxResults = 100, pageToken = undefined) {
  try {
    const listUsersResult = await auth.listUsers(maxResults, pageToken);
    
    return {
      users: listUsersResult.users,
      pageToken: listUsersResult.pageToken
    };
  } catch (error) {
    console.error('Error listing users:', error);
    throw error;
  }
}

/**
 * Create a custom token for a user (for client-side auth)
 * @param {string} uid - User UID
 * @returns {Promise<string>} Custom token
 */
async function createCustomToken(uid) {
  try {
    const customToken = await auth.createCustomToken(uid);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    throw error;
  }
}

module.exports = {
  createUser,
  getUserByUid,
  getUserByEmail,
  updateUser,
  deleteUser,
  verifyIdToken,
  setCustomClaims,
  listUsers,
  createCustomToken
};
