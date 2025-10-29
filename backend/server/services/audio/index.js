/**
 * Audio Service Module
 * Main entry point for audio-related functionality
 */

const { transcribeAudioAsync, transcribeAudio } = require('./transcription');
const { textToSpeechGoogle, streamingTextToSpeech } = require('./tts');
const {
    DEFAULT_AUDIO_DIR,
    ensureAudioDirectory,
    generateAudioPath,
    cleanupOldAudioFiles,
    deleteAudioFile,
    saveAudioFile,
    readAudioFile,
    getAudioFileInfo
} = require('./storage');

module.exports = {
    // Transcription
    transcribeAudioAsync,
    transcribeAudio,
    
    // Text-to-Speech
    textToSpeechGoogle,
    streamingTextToSpeech,
    
    // Storage
    DEFAULT_AUDIO_DIR,
    ensureAudioDirectory,
    generateAudioPath,
    cleanupOldAudioFiles,
    deleteAudioFile,
    saveAudioFile,
    readAudioFile,
    getAudioFileInfo
};
