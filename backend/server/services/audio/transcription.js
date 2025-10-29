/**
 * Audio Transcription Service
 * Handles speech-to-text using Gemini API
 */

/**
 * Transcribe audio using Gemini STT (async background processing)
 * @param {Buffer} audioBuffer - Audio data buffer
 * @param {string} userEmail - User email for history tracking
 * @param {string} mimeType - Audio MIME type (default: 'audio/webm')
 * @param {Object} geminiClient - Gemini AI client instance
 * @param {Function} addToHistoryFn - Function to add transcription to history
 * @param {Function} getHistoryFn - Function to get conversation history
 * @returns {Promise<string|null>} Transcription text or null on error
 */
async function transcribeAudioAsync(
    audioBuffer, 
    userEmail, 
    mimeType = 'audio/webm',
    geminiClient,
    addToHistoryFn,
    getHistoryFn
) {
    try {
        console.log(`   🎤 [Async STT] Starting background transcription for ${userEmail}...`);
        
        const base64Audio = audioBuffer.toString('base64');
        const transcriptionModel = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        
        const result = await transcriptionModel.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Audio
                }
            },
            { text: 'Transcribe this audio exactly as spoken. Only return the transcription text, nothing else.' }
        ]);
        
        const transcription = result.response.text().trim();
        console.log(`   ✅ [Async STT] Transcription complete: "${transcription.substring(0, 100)}${transcription.length > 100 ? '...' : ''}"`);
        
        // Add to history
        addToHistoryFn(userEmail, 'user', transcription);
        console.log(`   📝 [Async STT] Added to conversation history (${getHistoryFn(userEmail).length} messages)`);
        
        return transcription;
    } catch (error) {
        console.error(`   ❌ [Async STT] Transcription failed:`, error.message);
        return null;
    }
}

/**
 * Transcribe audio with synchronous handling (for immediate results)
 * @param {Buffer} audioBuffer - Audio data buffer
 * @param {string} mimeType - Audio MIME type
 * @param {Object} geminiClient - Gemini AI client instance
 * @returns {Promise<string>} Transcription text
 */
async function transcribeAudio(audioBuffer, mimeType = 'audio/webm', geminiClient) {
    console.log(`   🎤 [STT] Starting transcription...`);
    
    const base64Audio = audioBuffer.toString('base64');
    const transcriptionModel = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const result = await transcriptionModel.generateContent([
        {
            inlineData: {
                mimeType: mimeType,
                data: base64Audio
            }
        },
        { text: 'Transcribe this audio exactly as spoken. Only return the transcription text, nothing else.' }
    ]);
    
    const transcription = result.response.text().trim();
    console.log(`   ✅ [STT] Transcription complete: "${transcription.substring(0, 100)}${transcription.length > 100 ? '...' : ''}"`);
    
    return transcription;
}

module.exports = {
    transcribeAudioAsync,
    transcribeAudio
};
