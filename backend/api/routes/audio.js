/**
 * Audio Routes
 * 
 * Audio processing, transcription, and TTS
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const audioController = require('../controllers/audioController');

// Configure multer for file uploads (increased for longer recordings)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit (supports ~10 minutes of Opus audio)
    }
});

// Process audio file (PROTECTED)
// Note: genAI and model instances need to be passed from the main server
router.post('/api/process-audio', upload.single('audio'), (req, res) => {
    // genAI and model will be injected via middleware or passed from main app
    audioController.processAudio(
        req, 
        res, 
        req.app.get('genAI'),
        req.app.get('geminiModel')
    );
});

// Get available TTS voices (PROTECTED)
router.get('/api/voices', audioController.getVoices);

module.exports = router;
