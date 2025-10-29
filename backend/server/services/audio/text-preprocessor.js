/**
 * Text Preprocessing for Natural TTS
 * Cleans Gemini responses to sound more natural when spoken
 */

/**
 * Preprocess text from Gemini for natural speech synthesis
 * - Removes markdown formatting (**, __, *, _, #, -, etc.)
 * - Converts emojis to descriptive text or removes them
 * - Fixes repeated punctuation
 * - Normalizes whitespace and line breaks
 * @param {string} text - Raw text from Gemini
 * @returns {string} Cleaned text ready for TTS
 */
function preprocessTextForTTS(text) {
    if (!text) return '';
    
    let cleaned = text;
    
    // 1. Remove markdown formatting
    // Remove bold/italic markers (**, __, *, _)
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1'); // **bold** → bold
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');     // *italic* → italic
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');     // __bold__ → bold
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');       // _italic_ → italic
    
    // Remove headers (# ## ###)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');       // # Header → Header
    
    // Remove bullet points (-, *, •)
    cleaned = cleaned.replace(/^[\s]*[-*•]\s+/gm, '');   // - item → item
    
    // Remove code blocks (``` or `)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');    // ```code``` → (removed)
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');       // `code` → code
    
    // Remove horizontal rules (---, ___, ***)
    cleaned = cleaned.replace(/^[\s]*[-_*]{3,}[\s]*$/gm, '');
    
    // 2. Handle emojis - convert common ones to text or remove
    const emojiMap = {
        '📅': 'calendar',
        '🗓️': 'calendar',
        '⏰': 'alarm',
        '🕐': 'clock',
        '✅': 'done',
        '❌': 'error',
        '⚠️': 'warning',
        '💡': '',  // Remove lightbulb (decorative)
        '🔍': '',  // Remove magnifying glass
        '📝': '',  // Remove memo
        '🎯': '',  // Remove target
        '🚀': '',  // Remove rocket
        '💬': '',  // Remove speech bubble
        '👍': 'okay',
        '👎': 'not okay',
        '❤️': 'heart',
        '🎉': 'celebration',
        '😊': '',  // Remove smiley faces (redundant in speech)
        '😢': 'sad',
        '😂': 'funny',
    };
    
    // Replace known emojis
    Object.keys(emojiMap).forEach(emoji => {
        const replacement = emojiMap[emoji];
        cleaned = cleaned.replace(new RegExp(emoji, 'g'), replacement ? ` ${replacement} ` : '');
    });
    
    // Remove any remaining emojis (Unicode ranges for emojis)
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Symbols & pictographs
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport & map
    cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental symbols
    cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Misc symbols
    cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats
    
    // 3. Fix repeated punctuation (!!!, ???, ...)
    cleaned = cleaned.replace(/!{2,}/g, '!');   // !!! → !
    cleaned = cleaned.replace(/\?{2,}/g, '?');  // ??? → ?
    cleaned = cleaned.replace(/\.{4,}/g, '...'); // ..... → ...
    
    // 4. Normalize whitespace
    cleaned = cleaned.replace(/\r\n/g, '\n');        // Windows → Unix line endings
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');    // Multiple newlines → max 2
    cleaned = cleaned.replace(/[ \t]+/g, ' ');       // Multiple spaces → single space
    cleaned = cleaned.replace(/^\s+|\s+$/gm, '');    // Trim each line
    
    // 5. Convert multiple sentences on same line to have natural breaks
    // Add slight pause between sentences for better prosody
    cleaned = cleaned.replace(/([.!?])\s+([A-Z])/g, '$1 $2');
    
    // 6. Remove URLs (they sound terrible when spoken)
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    
    // 7. Final cleanup
    cleaned = cleaned.trim();
    
    return cleaned;
}

/**
 * Convert text to SSML with natural prosody and emphasis
 * @param {string} text - Preprocessed text
 * @param {Object} options - SSML options
 * @param {string} options.style - Voice style (lively, calm, empathetic, firm, apologetic)
 * @param {boolean} options.addBreaks - Add natural breaks between sentences
 * @param {boolean} options.emphasizeImportant - Auto-emphasize important words
 * @returns {string} SSML markup
 */
function textToSSML(text, options = {}) {
    const {
        style = null,           // lively, calm, empathetic, firm, apologetic
        addBreaks = true,       // Add <break> between sentences
        emphasizeImportant = true
    } = options;
    
    let ssml = text;
    
    // 1. Add emphasis to important words (very, really, must, never, always)
    if (emphasizeImportant) {
        const emphasisWords = ['very', 'really', 'must', 'never', 'always', 'important', 'critical', 'urgent'];
        emphasisWords.forEach(word => {
            const regex = new RegExp(`\\b(${word})\\b`, 'gi');
            ssml = ssml.replace(regex, '<emphasis level="moderate">$1</emphasis>');
        });
    }
    
    // 2. Add natural breaks between sentences (300ms pause)
    if (addBreaks) {
        ssml = ssml.replace(/([.!?])\s+/g, '$1<break time="300ms"/> ');
    }
    
    // 3. Handle numbers and dates naturally with <say-as>
    // Dates: "10/09/2025" → proper date pronunciation
    ssml = ssml.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, 
        '<say-as interpret-as="date" format="mdy">$1/$2/$3</say-as>');
    
    // Currency: "$1240" → "twelve hundred forty dollars"
    ssml = ssml.replace(/\$(\d+(?:\.\d{2})?)\b/g, 
        '<say-as interpret-as="currency">$$$1</say-as>');
    
    // Times: "3:30 PM" → proper time pronunciation
    ssml = ssml.replace(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi, 
        '<say-as interpret-as="time">$1:$2 $3</say-as>');
    
    // 4. Wrap in <speak> tag with optional style
    if (style) {
        // Google Cloud TTS supports styles for Neural2 voices
        ssml = `<speak><google:style name="${style}">${ssml}</google:style></speak>`;
    } else {
        ssml = `<speak>${ssml}</speak>`;
    }
    
    return ssml;
}

/**
 * Full preprocessing pipeline: clean text → SSML
 * @param {string} rawText - Raw text from Gemini
 * @param {Object} ssmlOptions - SSML options
 * @returns {string} SSML-formatted text ready for TTS
 */
function preprocessForTTS(rawText, ssmlOptions = {}) {
    const cleaned = preprocessTextForTTS(rawText);
    const ssml = textToSSML(cleaned, ssmlOptions);
    return ssml;
}

module.exports = {
    preprocessTextForTTS,
    textToSSML,
    preprocessForTTS
};
