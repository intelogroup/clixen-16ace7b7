const { initializeFirebase, getFirestore } = require('./firebase-config');

/**
 * User Management Service
 * Handles user creation, updates, and retrieval from Firestore
 */

const db = getFirestore();
const USERS_COLLECTION = 'users';

/**
 * Create or update user profile in Firestore
 * @param {Object} auth0User - Auth0 user object
 * @returns {Promise<Object>} User document
 */
async function createOrUpdateUser(auth0User) {
  try {
    const userId = auth0User.sub; // Auth0 user ID (e.g., "auth0|123456")
    const userRef = db.collection(USERS_COLLECTION).doc(userId);

    const userData = {
      auth0Id: auth0User.sub,
      email: auth0User.email,
      emailVerified: auth0User.email_verified || false,
      name: auth0User.name || '',
      nickname: auth0User.nickname || '',
      picture: auth0User.picture || '',
      locale: auth0User.locale || 'en',
      updatedAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    // Check if user exists
    const doc = await userRef.get();
    
    if (doc.exists) {
      // Update existing user
      await userRef.update(userData);
      console.log(`✅ Updated user: ${userId}`);
    } else {
      // Create new user with additional fields
      userData.createdAt = new Date().toISOString();
      userData.calendarSettings = {
        defaultDuration: 60, // minutes
        workingHours: {
          start: '09:00',
          end: '17:00'
        },
        timezone: 'America/New_York'
      };
      userData.preferences = {
        notifications: true,
        theme: 'light'
      };
      
      await userRef.set(userData);
      console.log(`✅ Created new user: ${userId}`);
    }

    return { id: userId, ...userData };
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
}

/**
 * Get user by Auth0 ID
 * @param {string} auth0Id - Auth0 user ID
 * @returns {Promise<Object|null>} User document or null
 */
async function getUserById(auth0Id) {
  try {
    const userRef = db.collection(USERS_COLLECTION).doc(auth0Id);
    const doc = await userRef.get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User document or null
 */
async function getUserByEmail(email) {
  try {
    const snapshot = await db.collection(USERS_COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Preferences to update
 * @returns {Promise<void>}
 */
async function updateUserPreferences(userId, preferences) {
  try {
    const userRef = db.collection(USERS_COLLECTION).doc(userId);
    await userRef.update({
      preferences,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Updated preferences for user: ${userId}`);
  } catch (error) {
    console.error('Error updating preferences:', error);
    throw error;
  }
}

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function deleteUser(userId) {
  try {
    await db.collection(USERS_COLLECTION).doc(userId).delete();
    console.log(`✅ Deleted user: ${userId}`);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Get all users (admin only)
 * @param {number} limit - Maximum number of users to return
 * @returns {Promise<Array>} Array of user documents
 */
async function getAllUsers(limit = 100) {
  try {
    const snapshot = await db.collection(USERS_COLLECTION)
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

module.exports = {
  createOrUpdateUser,
  getUserById,
  getUserByEmail,
  updateUserPreferences,
  deleteUser,
  getAllUsers
};
