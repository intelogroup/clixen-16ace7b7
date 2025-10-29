/**
 * Text-to-Speech Service
 * Handles speech synthesis using Google Cloud TTS API with streaming support
 * Supports SSML for natural prosody and text preprocessing
 */

const fs = require('fs');
const textToSpeech = require('@google-cloud/text-to-speech');
const { preprocessForTTS, preprocessTextForTTS } = require('./text-preprocessor');

/**
 * Convert text to speech using Google Cloud TTS (returns Buffer, no file write)
 * @param {string} text - Text to convert to speech (will be preprocessed)
 * @param {Object} voiceConfig - Voice configuration options
 * @param {string} voiceConfig.name - Voice name (e.g., 'en-US-Neural2-J', 'en-US-Neural2-F', 'en-US-Studio-O')
 * @param {string} voiceConfig.ssmlGender - Voice gender ('MALE' or 'FEMALE')
 * @param {number} voiceConfig.speakingRate - Speaking rate (default: 1.05)
 * @param {number} voiceConfig.pitch - Voice pitch (default: 0.0)
 * @param {number} voiceConfig.volumeGainDb - Volume gain in dB (default: 2.0)
 * @param {boolean} voiceConfig.useSSML - Use SSML for natural prosody (default: true)
 * @param {string} voiceConfig.style - Voice style: lively, calm, empathetic, firm, apologetic (Neural2-J/F only)
 * @returns {Promise<Buffer>} Audio content as Buffer
 * @throws {Error} If TTS fails or credentials not configured
 */
async function textToSpeechGoogle(text, voiceConfig = {}) {
    // Check if Google Cloud credentials are available
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const hasGoogleCloudCredentials = credPath && fs.existsSync(credPath);
    
    if (!hasGoogleCloudCredentials) {
        const errorMsg = `Google Cloud credentials NOT configured! Expected file: ${credPath || 'GOOGLE_APPLICATION_CREDENTIALS not set'}`;
        console.error(`   ❌ ${errorMsg}`);
        console.warn(`   💡 Fix: Set GOOGLE_APPLICATION_CREDENTIALS in .env to: ./backend/credentials/firebase-service-account.json`);
        throw new Error(errorMsg);
    }
    
    try {
        // Try Google Cloud TTS
        console.log(`   🎙️  Using Google Cloud TTS API (Premium Neural2 Voice)`);
        console.log(`   📄 Credentials: ${credPath}`);
        console.log(`   📝 Text: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
        
        // Initialize Google Cloud TTS client
        const client = new textToSpeech.TextToSpeechClient();
        
        // Preprocess text: remove markdown, emojis, clean formatting
        const useSSML = voiceConfig.useSSML !== false; // Default: true
        let processedText = text;
        
        if (useSSML) {
            // Full SSML preprocessing with prosody
            processedText = preprocessForTTS(text, {
                style: voiceConfig.style || null,
                addBreaks: true,
                emphasizeImportant: true
            });
            console.log(`   🎭 Using SSML with ${voiceConfig.style || 'default'} style`);
        } else {
            // Just clean the text without SSML
            processedText = preprocessTextForTTS(text);
        }
        
        // OPTIMIZED: Use highest quality Studio voices with best naturalness
        // Studio-O: Ultra-premium female voice (HIGHEST quality, most natural) ⭐ DEFAULT
        // Neural2-J: Natural, conversational male voice (good quality, lower cost)
        // Neural2-F: Warm, friendly female voice (good quality, lower cost)
        const defaultVoice = {
            languageCode: 'en-US',
            name: voiceConfig.name || 'en-US-Studio-O', // 🌟 Studio-O = Best quality
            ssmlGender: voiceConfig.ssmlGender || 'FEMALE'
        };
        
        // OPTIMIZATION: Slightly faster speaking rate for more natural conversation
        const request = {
            input: useSSML ? { ssml: processedText } : { text: processedText },
            voice: defaultVoice,
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: voiceConfig.speakingRate || 1.05, // Slightly faster = more natural
                pitch: voiceConfig.pitch || 0.0,
                volumeGainDb: voiceConfig.volumeGainDb || 2.0, // Slightly louder for clarity
                effectsProfileId: ['headphone-class-device'], // Optimize for headphones
            }
        };
        
        const isStudioVoice = defaultVoice.name.includes('Studio');
        console.log(`   🎵 Voice: ${defaultVoice.name} (${defaultVoice.ssmlGender})${isStudioVoice ? ' ⭐ STUDIO' : ''}`);
        console.log(`   ⚙️  Rate: ${request.audioConfig.speakingRate}x | Pitch: ${request.audioConfig.pitch} | Volume: +${request.audioConfig.volumeGainDb}dB`);
        
        // OPTIMIZATION: Increased timeout for longer responses
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TTS request timeout after 15s')), 15000)
        );
        
        const ttsPromise = client.synthesizeSpeech(request);
        const [response] = await Promise.race([ttsPromise, timeoutPromise]);
        
        // ✅ Return audio buffer directly (no disk write!)
        const audioBuffer = Buffer.from(response.audioContent);
        
        console.log(`   ✅ Google Cloud TTS successful!`);
        console.log(`   📦 Size: ${audioBuffer.length} bytes (${(audioBuffer.length / 1024).toFixed(2)} KB)`);
        
        // Quality indicator based on voice type
        if (isStudioVoice) {
            console.log(`   🎯 Quality: Studio (Ultra-Premium - Best Naturalness) ⭐⭐⭐⭐⭐⭐`);
        } else {
            console.log(`   🎯 Quality: Neural2 (Premium Natural Voice) ⭐⭐⭐⭐⭐`);
        }
        
        console.log(`   💾 Zero disk writes - streaming directly to client!`);
        
        return audioBuffer;
        
    } catch (error) {
        console.error(`   ❌ Google Cloud TTS ERROR: ${error.message}`);
        console.error(`   📍 Stack: ${error.stack?.split('\n')[0]}`);
        throw new Error(`Google Cloud TTS failed: ${error.message}`);
    }
}

/**
 * Streaming TTS: Split text into sentences and generate audio chunks in parallel
 * Returns array of audio buffers (no disk writes!)
 * @param {string} text - Text to convert to speech
 * @param {Object} voiceConfig - Voice configuration options
 * @returns {Promise<Buffer[]>} Array of audio buffers for each sentence
 */
async function streamingTextToSpeech(text, voiceConfig = {}) {
    console.log(`   🌊 STREAMING TTS: Processing text in chunks...`);
    
    // Split text into sentences (better for natural pauses)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    console.log(`   📝 Split into ${sentences.length} sentence(s)`);
    
    if (sentences.length === 1) {
        // For single sentence, return single buffer
        console.log(`   ℹ️  Single sentence - using standard TTS`);
        const buffer = await textToSpeechGoogle(text, voiceConfig);
        return [buffer];
    }
    
    // Generate first sentence immediately (for quick feedback)
    const firstSentenceStart = Date.now();
    const audioBuffers = [];
    
    console.log(`   ⚡ Generating first sentence immediately: "${sentences[0].trim().substring(0, 50)}..."`);
    const firstBuffer = await textToSpeechGoogle(sentences[0].trim(), voiceConfig);
    audioBuffers.push(firstBuffer);
    console.log(`   ✅ First sentence ready in ${Date.now() - firstSentenceStart}ms (can stream to client!)`);
    
    // Generate remaining sentences in parallel (with concurrency limit)
    const CONCURRENT_LIMIT = 3; // Don't overwhelm TTS API
    const remainingSentences = sentences.slice(1);
    
    if (remainingSentences.length > 0) {
        console.log(`   🔧 Generating ${remainingSentences.length} more sentence(s) in parallel (limit: ${CONCURRENT_LIMIT})...`);
        
        for (let i = 0; i < remainingSentences.length; i += CONCURRENT_LIMIT) {
            const batch = remainingSentences.slice(i, i + CONCURRENT_LIMIT);
            const batchPromises = batch.map((sentence, idx) => {
                const chunkIndex = i + idx + 1;
                console.log(`     • Chunk ${chunkIndex}: "${sentence.trim().substring(0, 40)}..."`);
                return textToSpeechGoogle(sentence.trim(), voiceConfig);
            });
            
            const batchBuffers = await Promise.all(batchPromises);
            audioBuffers.push(...batchBuffers);
        }
        
        console.log(`   ✅ All ${sentences.length} chunks generated!`);
    }
    
    console.log(`   � Zero disk writes - ${audioBuffers.length} audio buffers in memory ready to stream!`);
    return audioBuffers;
}

module.exports = {
    textToSpeechGoogle,
    streamingTextToSpeech
};
