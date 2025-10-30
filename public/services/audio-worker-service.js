/**
 * Audio Worker Service - Manages Web Worker for audio processing
 * Offloads audio processing tasks to a separate thread for better performance
 * 
 * Features:
 * - Web Worker initialization and lifecycle management
 * - Promise-based task execution
 * - Error handling and timeout management
 * - Support for multiple task types (analyze, encode, decode, etc.)
 */

class AudioWorkerService {
    constructor(workerPath = 'audio-worker.js') {
        this.workerPath = workerPath;
        this.worker = null;
        this.isInitialized = false;
        this.defaultTimeout = 5000; // 5 seconds
        
        // Task handlers
        this.taskHandlers = new Map();
    }
    
    /**
     * Initialize the audio worker
     * @returns {boolean} Success status
     */
    initialize() {
        try {
            console.log('🔧 Initializing Audio Worker...');
            const startTime = Date.now();
            
            this.worker = new Worker(this.workerPath);
            
            // Setup message handler
            this.worker.addEventListener('message', (e) => {
                const { success, result, task, error } = e.data;
                
                if (success) {
                    console.log(`✅ [Worker] Task completed: ${task}`);
                    this.handleTaskResult(task, result);
                } else {
                    console.error(`❌ [Worker] Task failed: ${task}`, error);
                    console.error('   💡 Check worker implementation for bugs');
                    this.handleTaskError(task, error);
                }
            });
            
            // Setup error handler
            this.worker.addEventListener('error', (error) => {
                console.error('❌ [Worker] Error:', error.message || error);
                console.error('   📍 File:', error.filename);
                console.error('   📍 Line:', error.lineno, ':', error.colno);
            });
            
            const duration = Date.now() - startTime;
            console.log(`✅ Audio Worker initialized in ${duration}ms`);
            console.log('   📦 Worker ready for: analysis, encoding, decoding');
            
            this.isInitialized = true;
            return true;
            
        } catch (error) {
            console.warn('⚠️  Could not initialize Audio Worker:', error.message);
            console.log('   📍 Falling back to direct processing (slower)');
            console.log('   💡 Tip: Check if audio-worker.js is accessible');
            this.worker = null;
            this.isInitialized = false;
            return false;
        }
    }
    
    /**
     * Process audio with worker
     * @param {Blob} audioBlob - Audio data to process
     * @param {string} task - Task type (e.g., 'analyze', 'encode', 'decode')
     * @param {number} timeout - Timeout in milliseconds (default: 5000)
     * @returns {Promise<any>} Result from worker
     */
    async process(audioBlob, task, timeout = this.defaultTimeout) {
        if (!this.isInitialized || !this.worker) {
            throw new Error('Audio Worker not initialized');
        }
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.removeTaskHandler(task);
                reject(new Error(`Worker task '${task}' timeout after ${timeout}ms`));
            }, timeout);
            
            // Register task handler
            const handler = {
                resolve: (result) => {
                    clearTimeout(timeoutId);
                    this.removeTaskHandler(task);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    this.removeTaskHandler(task);
                    reject(new Error(error));
                }
            };
            
            this.taskHandlers.set(task, handler);
            
            // Send task to worker
            this.worker.postMessage({ audioBlob, task });
        });
    }
    
    /**
     * Handle successful task completion
     * @param {string} task - Task type
     * @param {any} result - Result from worker
     */
    handleTaskResult(task, result) {
        const handler = this.taskHandlers.get(task);
        if (handler) {
            handler.resolve(result);
        }
        
        // Additional task-specific handling
        switch(task) {
            case 'analyze':
                console.log('📊 Audio analysis:', result);
                if (result.quality === 'poor') {
                    console.warn('⚠️  Audio quality is poor, consider re-recording');
                }
                break;
        }
    }
    
    /**
     * Handle task error
     * @param {string} task - Task type
     * @param {string} error - Error message
     */
    handleTaskError(task, error) {
        const handler = this.taskHandlers.get(task);
        if (handler) {
            handler.reject(error);
        }
    }
    
    /**
     * Remove task handler
     * @param {string} task - Task type
     */
    removeTaskHandler(task) {
        this.taskHandlers.delete(task);
    }
    
    /**
     * Send a message to the worker (advanced usage)
     * @param {any} message - Message to send
     */
    postMessage(message) {
        if (!this.isInitialized || !this.worker) {
            throw new Error('Audio Worker not initialized');
        }
        this.worker.postMessage(message);
    }
    
    /**
     * Check if worker is ready
     * @returns {boolean}
     */
    isReady() {
        return this.isInitialized && this.worker !== null;
    }
    
    /**
     * Get worker status
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isReady: this.isReady(),
            pendingTasks: this.taskHandlers.size
        };
    }
    
    /**
     * Terminate the worker
     */
    terminate() {
        if (this.worker) {
            console.log('🛑 Terminating Audio Worker...');
            
            // Reject all pending tasks
            this.taskHandlers.forEach((handler, task) => {
                handler.reject(new Error('Worker terminated'));
            });
            this.taskHandlers.clear();
            
            this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            
            console.log('   ✅ Audio Worker terminated');
        }
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        this.terminate();
    }
}

// Make available globally
window.AudioWorkerService = AudioWorkerService;

console.log('✅ Audio Worker service loaded');
