/**
 * User Settings Firestore Service
 * Manages user preferences and settings with caching layer
 */

const { getFirestore } = require('../../../../firebase-config');

// In-memory cache for user settings (reduces Firestore reads)
const settingsCache = new Map(); // userEmail -> { settings, lastFetch }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Default user settings structure
 */
const DEFAULT_SETTINGS = {
    voice: {
        name: 'en-US-Neural2-J',
        ssmlGender: 'MALE',
        speakingRate: 1.05,
        pitch: 0.0,
        volumeGainDb: 2.0
    },
    language: 'en-US',
    timezone: 'America/New_York',
    preferences: {
        conversationStyle: 'balanced', // 'concise', 'balanced', 'detailed'
        calendarView: 'week', // 'day', 'week', 'month'
        notificationsEnabled: true,
        audioAutoPlay: true
    },
    metadata: {
        createdAt: null,
        updatedAt: null,
        lastActive: null
    }
};

/**
 * Get user settings with caching
 * @param {string} userEmail - User email address
 * @returns {Promise<Object>} User settings object
 */
async function getUserSettings(userEmail) {
    if (!userEmail) {
        throw new Error('User email is required');
    }

    // Check cache first
    const cached = settingsCache.get(userEmail);
    if (cached && Date.now() - cached.lastFetch < CACHE_TTL) {
        console.log(`   💾 Cache HIT: User settings for ${userEmail}`);
        return cached.settings;
    }

    // Fetch from Firestore
    try {
        const db = getFirestore();
        const docRef = db.collection('users').doc(userEmail);
        const doc = await docRef.get();

        let settings;
        if (doc.exists) {
            settings = doc.data();
            console.log(`   📖 Firestore READ: User settings for ${userEmail}`);
        } else {
            // Create default settings for new user
            settings = {
                ...DEFAULT_SETTINGS,
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastActive: new Date().toISOString()
                }
            };
            await docRef.set(settings);
            console.log(`   ✅ Created default settings for new user: ${userEmail}`);
        }

        // Update cache
        settingsCache.set(userEmail, {
            settings,
            lastFetch: Date.now()
        });

        return settings;
    } catch (error) {
        console.error(`   ❌ Error fetching user settings for ${userEmail}:`, error);
        // Return default settings on error
        return DEFAULT_SETTINGS;
    }
}

/**
 * Update user settings
 * @param {string} userEmail - User email address
 * @param {Object} updates - Settings updates (partial or full)
 * @returns {Promise<Object>} Updated settings object
 */
async function updateUserSettings(userEmail, updates) {
    if (!userEmail) {
        throw new Error('User email is required');
    }

    if (!updates || typeof updates !== 'object') {
        throw new Error('Updates object is required');
    }

    try {
        const db = getFirestore();
        const docRef = db.collection('users').doc(userEmail);

        // Get current settings
        const currentSettings = await getUserSettings(userEmail);

        // Deep merge updates (supports nested updates)
        const updatedSettings = deepMerge(currentSettings, updates);
        
        // Update metadata
        updatedSettings.metadata = {
            ...updatedSettings.metadata,
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };

        // Save to Firestore
        await docRef.set(updatedSettings, { merge: true });
        console.log(`   ✅ Updated user settings for ${userEmail}`);

        // Invalidate cache
        settingsCache.delete(userEmail);

        return updatedSettings;
    } catch (error) {
        console.error(`   ❌ Error updating user settings for ${userEmail}:`, error);
        throw error;
    }
}

/**
 * Update last active timestamp
 * @param {string} userEmail - User email address
 * @returns {Promise<void>}
 */
async function updateLastActive(userEmail) {
    if (!userEmail) return;

    try {
        const db = getFirestore();
        const docRef = db.collection('users').doc(userEmail);
        
        await docRef.set({
            metadata: {
                lastActive: new Date().toISOString()
            }
        }, { merge: true });

        // Update cache if exists
        const cached = settingsCache.get(userEmail);
        if (cached) {
            cached.settings.metadata.lastActive = new Date().toISOString();
        }
    } catch (error) {
        console.error(`   ⚠️  Error updating last active for ${userEmail}:`, error.message);
    }
}

/**
 * Delete user settings
 * @param {string} userEmail - User email address
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteUserSettings(userEmail) {
    if (!userEmail) {
        throw new Error('User email is required');
    }

    try {
        const db = getFirestore();
        await db.collection('users').doc(userEmail).delete();
        
        // Invalidate cache
        settingsCache.delete(userEmail);
        
        console.log(`   🗑️  Deleted user settings for ${userEmail}`);
        return true;
    } catch (error) {
        console.error(`   ❌ Error deleting user settings for ${userEmail}:`, error);
        throw error;
    }
}

/**
 * Clear settings cache for a user or all users
 * @param {string} [userEmail] - Optional user email (clears all if not provided)
 */
function clearSettingsCache(userEmail = null) {
    if (userEmail) {
        settingsCache.delete(userEmail);
        console.log(`   🗑️  Cleared settings cache for ${userEmail}`);
    } else {
        const count = settingsCache.size;
        settingsCache.clear();
        console.log(`   🗑️  Cleared settings cache for all users (${count} entries)`);
    }
}

/**
 * Get settings cache statistics
 * @returns {Object} Cache stats
 */
function getSettingsCacheStats() {
    return {
        size: settingsCache.size,
        ttl: CACHE_TTL,
        entries: Array.from(settingsCache.keys())
    };
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

module.exports = {
    getUserSettings,
    updateUserSettings,
    updateLastActive,
    deleteUserSettings,
    clearSettingsCache,
    getSettingsCacheStats,
    DEFAULT_SETTINGS,
    CACHE_TTL
};
