/**
 * Local Intent Analyzer
 * Fast, privacy-focused intent classification without network calls
 * Provides instant acknowledgment responses for common user intents
 */

// Intent patterns with acknowledgment responses
const INTENT_PATTERNS = {
    // Calendar operations (order matters - most specific first!)
    calendar_find: {
        patterns: [
            /(?:when|what time)\s+(?:is|am i|do i have|'s)\s+(?:my\s+)?(?:meeting|event|appointment|call)\s+(?:with|about)/i,
            /(?:find|search|look for|look up)\s+(?:my\s+)?(?:meeting|event|appointment)\s+(?:with|about|for)/i
        ],
        acks: [
            "Looking that up for you {name}...",
            "Searching your calendar {name}...",
            "One sec {name}, finding that event...",
            "Hang on {name}, checking that for you..."
        ]
    },
    
    calendar_create: {
        patterns: [
            /(?:schedule|create|add|book|set up|make|plan)\s+(?:a\s+)?(?:meeting|event|appointment)/i,
            /(?:meeting|event|appointment)\s+(?:for|with|on)\s+/i
        ],
        acks: [
            "Alright {name}, I'll schedule that for you...",
            "Sure thing {name}, creating that event now...",
            "On it {name}, adding that to your calendar...",
            "Got it {name}, setting up that meeting..."
        ]
    },
    
    calendar_check: {
        patterns: [
            /(?:check|show|what'?s|list|tell me)\s+(?:my\s+)?(?:calendar|schedule|events?|appointments?|meetings?)/i,
            /(?:do i have|what'?s on|any)\s+(?:meetings?|events?|appointments?)/i,
            /(?:am i\s+)?(?:free|busy|available)\s+(?:on|this|next|tomorrow|today)/i,
            /when\s+(?:am i|is my)\s+(?:next|first)\s+(?:meeting|event|appointment)/i
        ],
        acks: [
            "Okay {name}, checking your calendar now...",
            "Sure {name}, let me look at your schedule...",
            "One moment {name}, pulling up your calendar...",
            "Got it {name}, searching your events..."
        ]
    },
    
    calendar_conflicts: {
        patterns: [
            /(?:any|check for|do i have)\s+(?:conflicts?|overlaps?|scheduling\s+conflicts?)/i,
            /(?:double booked|overlapping\s+meetings?)/i
        ],
        acks: [
            "Checking for conflicts now {name}...",
            "Analyzing your schedule {name}...",
            "One moment {name}, scanning for overlaps..."
        ]
    },
    
    // Information queries
    search_question: {
        patterns: [
            /^(?:what|who|where|why|how)\s+(?:is|are|was|were|do|does|did|can|could|would|should)/i,
            /^(?:tell me about|explain|describe|define)\s+/i,
            /^(?:find|search|look up)\s+(?:information|info)\s+(?:about|on)/i,
            /^what'?s?\s+\w+/i  // "what's quantum computing"
        ],
        acks: [
            "Let me search that for you {name}...",
            "Looking that up now {name}...",
            "One moment {name}, finding that info...",
            "Searching {name}..."
        ]
    },
    
    // Reminders & tasks
    reminder_create: {
        patterns: [
            /(?:remind|reminder)\s+me\s+(?:to|about)/i,
            /(?:set|create|add)\s+(?:a\s+)?reminder/i,
            /don'?t let me forget/i
        ],
        acks: [
            "I'll remind you {name}...",
            "Setting that reminder now {name}...",
            "Got it {name}, I'll make sure you don't forget...",
            "Reminder set {name}..."
        ]
    },
    
    // Quick confirmations
    simple_confirm: {
        patterns: [
            /^(?:yes|yeah|yep|sure|okay|ok|right|correct|exactly|absolutely|definitely)$/i,
            /^(?:that'?s?\s+)?(?:right|correct|good|fine|perfect)$/i
        ],
        acks: [
            "Got it {name}.",
            "Perfect {name}.",
            "Understood {name}.",
            "Okay {name}."
        ]
    },
    
    // Quick denials
    simple_deny: {
        patterns: [
            /^(?:no|nope|nah|not really|don'?t|never mind|cancel|stop)$/i,
            /^(?:that'?s?\s+)?(?:wrong|incorrect|no\s+thanks?)$/i
        ],
        acks: [
            "Okay {name}, no problem.",
            "Understood {name}.",
            "Got it {name}.",
            "Alright {name}."
        ]
    },
    
    // Time queries
    time_query: {
        patterns: [
            /^(?:what\s+)?(?:time|date)\s+(?:is\s+it|now)/i,
            /^(?:what'?s?\s+)?(?:the\s+)?(?:current\s+)?(?:time|date)/i,
            /^(?:tell me|what'?s)\s+(?:the\s+)?(?:time|date)/i
        ],
        acks: [
            "Let me check that for you {name}...",
            "One moment {name}...",
            "Sure {name}..."
        ]
    },
    
    // Greetings
    greeting: {
        patterns: [
            /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))/i,
            /^(?:what'?s\s+up|howdy|greetings)/i
        ],
        acks: [
            "Hello {name}!",
            "Hi there {name}!",
            "Hey {name}!",
            "Good to hear from you {name}!"
        ]
    }
};

// Semantic keywords for fuzzy matching (backup to regex)
const SEMANTIC_KEYWORDS = {
    calendar: ['calendar', 'schedule', 'event', 'meeting', 'appointment', 'busy', 'free', 'available'],
    create: ['schedule', 'create', 'add', 'book', 'set up', 'make', 'plan'],
    search: ['find', 'search', 'look', 'show', 'list', 'what', 'when', 'where'],
    time: ['time', 'date', 'clock', 'today', 'tomorrow', 'week', 'month'],
    confirm: ['yes', 'yeah', 'yep', 'sure', 'okay', 'right', 'correct'],
    deny: ['no', 'nope', 'nah', 'cancel', 'stop', 'never mind']
};

/**
 * Analyze user intent from transcribed text
 * @param {string} text - Transcribed user speech
 * @param {string} userName - User's first name for personalization
 * @returns {Object|null} { intent, ack, confidence } or null if no match
 */
function analyzeIntent(text, userName = 'there') {
    if (!text || text.trim().length === 0) {
        return null;
    }

    const normalizedText = text.trim();
    
    // Try pattern matching first (fastest, most accurate)
    for (const [intentName, intentData] of Object.entries(INTENT_PATTERNS)) {
        for (const pattern of intentData.patterns) {
            if (pattern.test(normalizedText)) {
                // Select random ack for variety
                const ack = selectRandomAck(intentData.acks, userName);
                
                return {
                    intent: intentName,
                    ack: ack,
                    confidence: 0.95, // High confidence for regex match
                    method: 'regex'
                };
            }
        }
    }
    
    // Fallback to keyword-based semantic matching
    const semanticMatch = findSemanticMatch(normalizedText);
    if (semanticMatch) {
        const intentData = INTENT_PATTERNS[semanticMatch.intent];
        if (intentData) {
            const ack = selectRandomAck(intentData.acks, userName);
            return {
                intent: semanticMatch.intent,
                ack: ack,
                confidence: semanticMatch.confidence,
                method: 'semantic'
            };
        }
    }
    
    // No clear intent detected
    return null;
}

/**
 * Semantic keyword matching (fuzzy fallback)
 * @param {string} text - User text
 * @returns {Object|null} { intent, confidence }
 */
function findSemanticMatch(text) {
    const words = text.toLowerCase().split(/\s+/);
    const scores = {};
    
    // Check for calendar operations
    if (hasKeywords(words, SEMANTIC_KEYWORDS.calendar)) {
        if (hasKeywords(words, SEMANTIC_KEYWORDS.create)) {
            scores.calendar_create = 0.8;
        } else if (hasKeywords(words, SEMANTIC_KEYWORDS.search)) {
            scores.calendar_find = 0.8;
        } else {
            scores.calendar_check = 0.75;
        }
    }
    
    // Check for simple confirmations
    if (words.length <= 3 && hasKeywords(words, SEMANTIC_KEYWORDS.confirm)) {
        scores.simple_confirm = 0.85;
    }
    
    // Check for simple denials
    if (words.length <= 3 && hasKeywords(words, SEMANTIC_KEYWORDS.deny)) {
        scores.simple_deny = 0.85;
    }
    
    // Check for time queries
    if (hasKeywords(words, SEMANTIC_KEYWORDS.time)) {
        scores.time_query = 0.8;
    }
    
    // Return highest scoring intent
    const entries = Object.entries(scores);
    if (entries.length === 0) {
        return null;
    }
    
    const [intent, confidence] = entries.reduce((max, curr) => 
        curr[1] > max[1] ? curr : max
    );
    
    // Only return if confidence is reasonable
    return confidence > 0.7 ? { intent, confidence } : null;
}

/**
 * Check if words array contains any keywords
 * @param {Array<string>} words - Text words
 * @param {Array<string>} keywords - Keywords to check
 * @returns {boolean}
 */
function hasKeywords(words, keywords) {
    return keywords.some(keyword => 
        words.some(word => 
            word.includes(keyword) || keyword.includes(word)
        )
    );
}

/**
 * Select random acknowledgment and personalize
 * @param {Array<string>} acks - Acknowledgment templates
 * @param {string} userName - User's name
 * @returns {string}
 */
function selectRandomAck(acks, userName) {
    const randomAck = acks[Math.floor(Math.random() * acks.length)];
    return randomAck.replace(/{name}/g, userName);
}

/**
 * Check if intent analysis should be used
 * @param {string} text - User text
 * @returns {boolean}
 */
function shouldUseInstantAck(text) {
    // Use instant ack for:
    // - Questions (contain '?')
    // - Action requests (contain calendar/schedule/create etc)
    // - Short responses (< 5 words)
    
    const words = text.trim().split(/\s+/);
    
    if (text.includes('?')) return true;
    if (words.length <= 5) return true;
    
    // Check if contains action keywords
    const actionKeywords = ['check', 'show', 'schedule', 'create', 'find', 'search', 'tell', 'remind'];
    return actionKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
    );
}

/**
 * Get generic fallback acknowledgment
 * @param {string} userName - User's name
 * @returns {string}
 */
function getGenericAck(userName = 'there') {
    const genericAcks = [
        `One moment ${userName}...`,
        `Let me help you with that ${userName}...`,
        `Sure ${userName}, working on it...`,
        `Okay ${userName}, give me a sec...`,
        `Got it ${userName}, processing that now...`
    ];
    return genericAcks[Math.floor(Math.random() * genericAcks.length)];
}

/**
 * Performance metrics
 */
let metrics = {
    totalAnalyses: 0,
    regexMatches: 0,
    semanticMatches: 0,
    noMatches: 0,
    avgProcessingTime: 0
};

/**
 * Analyze with metrics
 * @param {string} text - User text
 * @param {string} userName - User name
 * @returns {Object|null}
 */
function analyzeWithMetrics(text, userName) {
    const startTime = process.hrtime.bigint();
    
    const result = analyzeIntent(text, userName);
    
    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1_000_000; // Convert to ms
    
    // Update metrics
    metrics.totalAnalyses++;
    if (result) {
        if (result.method === 'regex') metrics.regexMatches++;
        if (result.method === 'semantic') metrics.semanticMatches++;
    } else {
        metrics.noMatches++;
    }
    
    // Rolling average
    metrics.avgProcessingTime = (
        (metrics.avgProcessingTime * (metrics.totalAnalyses - 1) + processingTime) / 
        metrics.totalAnalyses
    );
    
    return result;
}

/**
 * Get performance metrics
 * @returns {Object}
 */
function getMetrics() {
    return {
        ...metrics,
        regexMatchRate: (metrics.regexMatches / metrics.totalAnalyses * 100).toFixed(1) + '%',
        semanticMatchRate: (metrics.semanticMatches / metrics.totalAnalyses * 100).toFixed(1) + '%',
        noMatchRate: (metrics.noMatches / metrics.totalAnalyses * 100).toFixed(1) + '%'
    };
}

/**
 * Reset metrics
 */
function resetMetrics() {
    metrics = {
        totalAnalyses: 0,
        regexMatches: 0,
        semanticMatches: 0,
        noMatches: 0,
        avgProcessingTime: 0
    };
}

module.exports = {
    analyzeIntent,
    analyzeWithMetrics,
    shouldUseInstantAck,
    getGenericAck,
    getMetrics,
    resetMetrics
};
