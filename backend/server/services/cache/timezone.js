/**
 * Timezone Cache Service
 * 
 * Caches user timezone from Google Calendar to avoid repeated API calls.
 * TTL: 24 hours
 */

// Timezone cache store
const timezoneCache = new Map(); // userEmail -> { timezone, cachedAt }
const TIMEZONE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached timezone or fetch from Calendar API
 * @param {string} userEmail - User email address
 * @param {Function} getCalendarClient - Function to get authenticated Calendar client
 * @returns {Promise<string>} Timezone string (e.g., 'America/New_York')
 */
async function getCachedTimezone(userEmail, getCalendarClient) {
    const cached = timezoneCache.get(userEmail);
    const now = Date.now();
    
    // Return cached timezone if still valid
    if (cached && (now - cached.cachedAt) < TIMEZONE_CACHE_DURATION) {
        console.log(`   📦 Using cached timezone for ${userEmail}: ${cached.timezone}`);
        return cached.timezone;
    }
    
    // Cache miss or expired - fetch from Calendar
    console.log(`   🔄 Fetching timezone from Calendar for ${userEmail}...`);
    try {
        const calendar = await getCalendarClient(userEmail);
        const calendarSettings = await calendar.settings.get({
            setting: 'timezone'
        });
        
        const timezone = calendarSettings.data.value || 'America/New_York';
        
        // Cache the result
        timezoneCache.set(userEmail, {
            timezone,
            cachedAt: now
        });
        
        console.log(`   ✅ Timezone cached: ${timezone}`);
        return timezone;
    } catch (error) {
        console.error(`   ❌ Failed to get timezone:`, error.message);
        return 'America/New_York'; // Fallback
    }
}

/**
 * Clear timezone cache for a specific user
 * @param {string} userEmail - User email address
 */
function clearTimezoneCache(userEmail) {
    if (timezoneCache.has(userEmail)) {
        timezoneCache.delete(userEmail);
        console.log(`   🗑️  Cleared timezone cache for ${userEmail}`);
    }
}

/**
 * Clear all timezone cache entries
 */
function clearAllTimezoneCache() {
    const count = timezoneCache.size;
    timezoneCache.clear();
    console.log(`   🗑️  Cleared all timezone cache (${count} entries)`);
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getTimezoneStats() {
    return {
        size: timezoneCache.size,
        ttl: TIMEZONE_CACHE_DURATION
    };
}

module.exports = {
    getCachedTimezone,
    clearTimezoneCache,
    clearAllTimezoneCache,
    getTimezoneStats
};
