/**
 * Audio Storage Service
 * Handles audio file storage, cleanup, and management
 */

const fs = require('fs');
const path = require('path');

/**
 * Default audio storage directory
 */
const DEFAULT_AUDIO_DIR = path.join(__dirname, '../../../../public');

/**
 * Ensure audio storage directory exists
 * @param {string} dirPath - Directory path to create
 */
function ensureAudioDirectory(dirPath = DEFAULT_AUDIO_DIR) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`   📁 Created audio directory: ${dirPath}`);
    }
}

/**
 * Generate unique audio file path
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension (default: 'mp3')
 * @param {string} directory - Storage directory (default: public/)
 * @returns {string} Full file path
 */
function generateAudioPath(prefix = 'audio', extension = 'mp3', directory = DEFAULT_AUDIO_DIR) {
    ensureAudioDirectory(directory);
    const timestamp = Date.now();
    const filename = `${prefix}-${timestamp}.${extension}`;
    return path.join(directory, filename);
}

/**
 * Clean up old audio files
 * @param {string} directory - Directory to clean
 * @param {number} maxAgeMs - Maximum file age in milliseconds (default: 1 hour)
 * @returns {number} Number of files deleted
 */
function cleanupOldAudioFiles(directory = DEFAULT_AUDIO_DIR, maxAgeMs = 60 * 60 * 1000) {
    if (!fs.existsSync(directory)) {
        return 0;
    }
    
    const now = Date.now();
    let deletedCount = 0;
    
    try {
        const files = fs.readdirSync(directory);
        
        for (const file of files) {
            // Only process audio files
            if (!file.match(/\.(mp3|wav|webm|opus)$/i)) {
                continue;
            }
            
            const filePath = path.join(directory, file);
            
            try {
                const stats = fs.statSync(filePath);
                const ageMs = now - stats.mtimeMs;
                
                if (ageMs > maxAgeMs) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`   🗑️  Deleted old audio file: ${file} (age: ${Math.round(ageMs / 1000 / 60)}min)`);
                }
            } catch (err) {
                console.warn(`   ⚠️  Failed to check/delete file ${file}:`, err.message);
            }
        }
        
        if (deletedCount > 0) {
            console.log(`   ✅ Cleaned up ${deletedCount} old audio file(s)`);
        }
    } catch (err) {
        console.error(`   ❌ Error cleaning audio directory:`, err.message);
    }
    
    return deletedCount;
}

/**
 * Delete a specific audio file
 * @param {string} filePath - Path to file to delete
 * @returns {boolean} True if deleted successfully
 */
function deleteAudioFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`   🗑️  Deleted audio file: ${path.basename(filePath)}`);
            return true;
        }
        return false;
    } catch (err) {
        console.error(`   ❌ Failed to delete audio file ${filePath}:`, err.message);
        return false;
    }
}

/**
 * Save audio buffer to file
 * @param {Buffer} audioBuffer - Audio data
 * @param {string} outputPath - Path to save file
 * @param {string} encoding - File encoding (default: 'binary')
 * @returns {Object} File info (path, size)
 */
function saveAudioFile(audioBuffer, outputPath, encoding = 'binary') {
    try {
        const directory = path.dirname(outputPath);
        ensureAudioDirectory(directory);
        
        fs.writeFileSync(outputPath, audioBuffer, encoding);
        
        const stats = fs.statSync(outputPath);
        console.log(`   💾 Saved audio file: ${path.basename(outputPath)} (${(stats.size / 1024).toFixed(2)} KB)`);
        
        return {
            path: outputPath,
            size: stats.size,
            sizeKB: (stats.size / 1024).toFixed(2)
        };
    } catch (err) {
        console.error(`   ❌ Failed to save audio file:`, err.message);
        throw err;
    }
}

/**
 * Read audio file as buffer
 * @param {string} filePath - Path to audio file
 * @returns {Buffer} Audio data
 */
function readAudioFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Audio file not found: ${filePath}`);
        }
        
        return fs.readFileSync(filePath);
    } catch (err) {
        console.error(`   ❌ Failed to read audio file:`, err.message);
        throw err;
    }
}

/**
 * Get audio file info
 * @param {string} filePath - Path to audio file
 * @returns {Object|null} File stats or null if not found
 */
function getAudioFileInfo(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        
        const stats = fs.statSync(filePath);
        return {
            path: filePath,
            size: stats.size,
            sizeKB: (stats.size / 1024).toFixed(2),
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            created: stats.birthtime,
            modified: stats.mtime
        };
    } catch (err) {
        console.error(`   ❌ Failed to get audio file info:`, err.message);
        return null;
    }
}

module.exports = {
    DEFAULT_AUDIO_DIR,
    ensureAudioDirectory,
    generateAudioPath,
    cleanupOldAudioFiles,
    deleteAudioFile,
    saveAudioFile,
    readAudioFile,
    getAudioFileInfo
};
