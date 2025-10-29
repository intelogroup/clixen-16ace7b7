/**
 * Calendar Query Cache Service
 * 
 * Caches Google Calendar API query results to reduce API calls.
 * TTL: 5 minutes
 */

// Calendar query cache store
const calendarQueryCache = new Map(); // cacheKey -> { data, cachedAt }
const CALENDAR_QUERY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache statistics
let cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    writes: 0
};

/**
 * Generate cache key for calendar queries
 * @param {string} userEmail - User email address
 * @param {Object} args - Query arguments
 * @returns {string} Cache key
 */
function generateCalendarCacheKey(userEmail, args) {
    const key = `${userEmail}:${JSON.stringify(args)}`;
    return key;
}

/**
 * Get cached calendar query result
 * @param {string} userEmail - User email address
 * @param {Object} args - Query arguments
 * @returns {any|null} Cached data or null if not found/expired
 */
function getCachedCalendarQuery(userEmail, args) {
    const cacheKey = generateCalendarCacheKey(userEmail, args);
    const cached = calendarQueryCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.cachedAt) < CALENDAR_QUERY_CACHE_DURATION) {
        cacheStats.hits++;
        const age = Math.round((Date.now() - cached.cachedAt) / 1000);
        const hitRate = ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1);
        console.log(`   📦 Cache HIT (age: ${age}s) - Hit rate: ${hitRate}%`);
        return cached.data;
    }
    
    cacheStats.misses++;
    const hitRate = cacheStats.hits > 0 ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) : '0.0';
    console.log(`   ❌ Cache MISS - Hit rate: ${hitRate}%`);
    return null;
}

/**
 * Cache calendar query result
 * @param {string} userEmail - User email address
 * @param {Object} args - Query arguments
 * @param {any} data - Data to cache
 */
function cacheCalendarQuery(userEmail, args, data) {
    const cacheKey = generateCalendarCacheKey(userEmail, args);
    calendarQueryCache.set(cacheKey, {
        data,
        cachedAt: Date.now()
    });
    cacheStats.writes++;
    console.log(`   ✅ Calendar query cached (TTL: 5 min) - Total cached: ${calendarQueryCache.size}`);
}

/**
 * Invalidate calendar cache for a user (call after create/update/delete)
 * @param {string} userEmail - User email address
 */
function invalidateCalendarCache(userEmail) {
    let invalidatedCount = 0;
    for (const [key, value] of calendarQueryCache.entries()) {
        if (key.startsWith(`${userEmail}:`)) {
            calendarQueryCache.delete(key);
            invalidatedCount++;
            cacheStats.evictions++;
        }
    }
    if (invalidatedCount > 0) {
        console.log(`   🗑️  Invalidated ${invalidatedCount} cached entries for ${userEmail} (total evictions: ${cacheStats.evictions})`);
    }
}

/**
 * Clear specific calendar query cache entry
 * @param {string} userEmail - User email address
 * @param {Object} args - Query arguments
 */
function clearCalendarQueryCache(userEmail, args) {
    const cacheKey = generateCalendarCacheKey(userEmail, args);
    if (calendarQueryCache.has(cacheKey)) {
        calendarQueryCache.delete(cacheKey);
        console.log(`   🗑️  Cleared calendar query cache for key: ${cacheKey}`);
    }
}

/**
 * Clear all calendar query cache entries
 */
function clearAllCalendarCache() {
    const count = calendarQueryCache.size;
    calendarQueryCache.clear();
    console.log(`   🗑️  Cleared all calendar query cache (${count} entries)`);
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCalendarCacheStats() {
    const hitRate = cacheStats.hits > 0 ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) : 0;
    return {
        size: calendarQueryCache.size,
        ttl: CALENDAR_QUERY_CACHE_DURATION,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        writes: cacheStats.writes,
        evictions: cacheStats.evictions,
        hitRate: `${hitRate}%`
    };
}

module.exports = {
    generateCalendarCacheKey,
    getCachedCalendarQuery,
    cacheCalendarQuery,
    invalidateCalendarCache,
    clearCalendarQueryCache,
    clearAllCalendarCache,
    getCalendarCacheStats
};
