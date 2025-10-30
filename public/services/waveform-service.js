/**
 * Waveform Service - Audio visualization for playback
 * Renders circular waveform visualization with real-time audio analysis
 * 
 * Features:
 * - Circular waveform rendering
 * - Idle and playing states
 * - Real-time audio frequency analysis
 * - Smooth animations with requestAnimationFrame
 * - Proper cleanup to prevent memory leaks
 */

class WaveformService {
    constructor(canvasElement, statusElement, containerElement) {
        this.canvas = canvasElement;
        this.statusElement = statusElement;
        this.containerElement = containerElement;
        
        // Canvas context
        this.context = null;
        
        // Audio analysis
        this.audioContext = null;
        this.analyser = null;
        this.animationId = null;
        
        // State
        this.state = 'idle'; // 'idle' or 'playing'
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            centerX: 125,
            centerY: 125,
            radius: 70,
            maxBarHeight: 60,
            bars: 60,
            idleRadius: 80,
            idleBarHeight: 15
        };
    }
    
    /**
     * Initialize canvas for waveform rendering
     * @returns {boolean} Success status
     */
    initialize() {
        if (!this.canvas) {
            console.warn('⚠️ Canvas element not found');
            return false;
        }
        
        try {
            // Set canvas size for circular waveform
            const dpr = window.devicePixelRatio || 1;
            
            this.canvas.width = 250 * dpr;
            this.canvas.height = 250 * dpr;
            this.canvas.style.width = '250px';
            this.canvas.style.height = '250px';
            
            this.context = this.canvas.getContext('2d');
            this.context.scale(dpr, dpr);
            
            console.log(`✅ Waveform canvas initialized in circular mode`);
            
            // Draw idle state
            this.drawIdleWaveform();
            
            this.isInitialized = true;
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize waveform canvas:', error);
            return false;
        }
    }
    
    /**
     * Setup audio analyzer for real-time visualization
     * @param {HTMLAudioElement} audioElement - Audio element to visualize
     * @returns {boolean} Success status
     */
    setupAnalyzer(audioElement) {
        try {
            // Only create audio context and source once to avoid "already connected" error
            if (!this.audioContext) {
                // Create audio context for waveform visualization
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
                
                // Create analyser
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                this.analyser.smoothingTimeConstant = 0.8;
                
                // Connect audio element to analyser (can only be done once per element)
                const source = this.audioContext.createMediaElementSource(audioElement);
                source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                
                console.log('✅ Waveform analyzer connected (first time)');
            } else {
                // Resume audio context if it was suspended
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                    console.log('✅ Waveform audio context resumed');
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Could not setup waveform analyzer:', error);
            console.error('   This is usually because the audio element is already connected.');
            console.error('   Error details:', error.message);
            return false;
        }
    }
    
    /**
     * Set waveform state (idle or playing)
     * @param {string} state - 'idle' or 'playing'
     */
    setState(state) {
        this.state = state;
        
        if (state === 'playing') {
            if (this.containerElement) {
                this.containerElement.classList.add('playing');
            }
            
            if (this.statusElement) {
                this.statusElement.classList.add('hidden');
                
                const statusText = this.statusElement.querySelector('.status-text');
                const statusIcon = this.statusElement.querySelector('.status-icon');
                if (statusText) statusText.textContent = 'Playing';
                if (statusIcon) statusIcon.textContent = '🔊';
            }
        } else {
            if (this.containerElement) {
                this.containerElement.classList.remove('playing');
            }
            
            if (this.statusElement) {
                this.statusElement.classList.remove('hidden');
                
                const statusText = this.statusElement.querySelector('.status-text');
                const statusIcon = this.statusElement.querySelector('.status-icon');
                if (statusText) statusText.textContent = 'Ready';
                if (statusIcon) statusIcon.textContent = '🎵';
            }
            
            // Draw idle state
            this.drawIdleWaveform();
        }
        
        console.log(`🎛️  Waveform state: ${state}`);
    }
    
    /**
     * Start animation loop
     */
    startAnimation() {
        if (!this.analyser || !this.context) {
            console.warn('⚠️ Analyzer or context not initialized');
            return;
        }
        
        const dpr = window.devicePixelRatio || 1;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            if (this.state !== 'playing') {
                return; // Stop if not playing
            }
            
            this.animationId = requestAnimationFrame(draw);
            
            this.analyser.getByteFrequencyData(dataArray);
            
            // Clear canvas
            this.context.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
            
            this.drawCircularWaveform(dataArray, bufferLength);
        };
        
        draw();
    }
    
    /**
     * Stop animation loop
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            console.log('🛑 Waveform visualization stopped');
        }
        
        // Return to idle state
        this.setState('idle');
    }
    
    /**
     * Draw idle waveform (static pattern)
     */
    drawIdleWaveform() {
        if (!this.context) return;
        
        const dpr = window.devicePixelRatio || 1;
        
        // Clear canvas
        this.context.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
        
        // Create gradient for circular waveform
        const gradient = this.context.createRadialGradient(
            this.config.centerX, this.config.centerY, 30,
            this.config.centerX, this.config.centerY, 100
        );
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
        gradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.3)');
        gradient.addColorStop(1, 'rgba(102, 126, 234, 0.3)');
        
        // Draw idle circular waveform
        for (let i = 0; i < this.config.bars; i++) {
            const angle = (Math.PI * 2 * i) / this.config.bars;
            const barHeight = this.config.idleBarHeight + Math.sin(i * 0.5) * 5; // Subtle wave
            
            const x1 = this.config.centerX + Math.cos(angle) * this.config.idleRadius;
            const y1 = this.config.centerY + Math.sin(angle) * this.config.idleRadius;
            const x2 = this.config.centerX + Math.cos(angle) * (this.config.idleRadius + barHeight);
            const y2 = this.config.centerY + Math.sin(angle) * (this.config.idleRadius + barHeight);
            
            this.context.strokeStyle = gradient;
            this.context.lineWidth = 3;
            this.context.lineCap = 'round';
            this.context.beginPath();
            this.context.moveTo(x1, y1);
            this.context.lineTo(x2, y2);
            this.context.stroke();
        }
    }
    
    /**
     * Draw circular waveform with real-time audio data
     * @param {Uint8Array} dataArray - Frequency data from analyzer
     * @param {number} bufferLength - Length of data array
     */
    drawCircularWaveform(dataArray, bufferLength) {
        // Create gradient
        const gradient = this.context.createRadialGradient(
            this.config.centerX, this.config.centerY, this.config.radius,
            this.config.centerX, this.config.centerY, this.config.radius + this.config.maxBarHeight
        );
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        
        // Draw center circle
        this.context.beginPath();
        this.context.arc(this.config.centerX, this.config.centerY, 50, 0, Math.PI * 2);
        this.context.fillStyle = 'rgba(102, 126, 234, 0.1)';
        this.context.fill();
        
        // Draw bars
        for (let i = 0; i < this.config.bars; i++) {
            const dataIndex = Math.floor((i / this.config.bars) * bufferLength);
            const amplitude = dataArray[dataIndex] / 255;
            const barHeight = amplitude * this.config.maxBarHeight;
            
            const angle = (Math.PI * 2 * i) / this.config.bars - Math.PI / 2;
            
            const x1 = this.config.centerX + Math.cos(angle) * this.config.radius;
            const y1 = this.config.centerY + Math.sin(angle) * this.config.radius;
            const x2 = this.config.centerX + Math.cos(angle) * (this.config.radius + barHeight);
            const y2 = this.config.centerY + Math.sin(angle) * (this.config.radius + barHeight);
            
            this.context.strokeStyle = gradient;
            this.context.lineWidth = 4;
            this.context.lineCap = 'round';
            this.context.beginPath();
            this.context.moveTo(x1, y1);
            this.context.lineTo(x2, y2);
            this.context.stroke();
        }
    }
    
    /**
     * Show waveform container
     */
    show() {
        if (this.containerElement) {
            this.containerElement.style.display = 'block';
        }
    }
    
    /**
     * Hide waveform container
     */
    hide() {
        if (this.containerElement) {
            this.containerElement.style.display = 'none';
        }
    }
    
    /**
     * Get current state
     * @returns {Object} State object
     */
    getState() {
        return {
            state: this.state,
            isInitialized: this.isInitialized,
            isAnimating: !!this.animationId
        };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('🧹 Cleaning up waveform service...');
        
        // Stop animation
        this.stopAnimation();
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().then(() => {
                console.log('   ✅ Closed waveform audio context');
            }).catch((e) => {
                console.warn('   ⚠️ Error closing waveform audio context:', e);
            });
            this.audioContext = null;
        }
        
        // Clear analyser
        this.analyser = null;
        
        // Clear context
        if (this.context) {
            const dpr = window.devicePixelRatio || 1;
            this.context.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
        }
        
        this.isInitialized = false;
        
        console.log('   ✅ Waveform service cleaned up');
    }
}

// Make available globally
window.WaveformService = WaveformService;

console.log('✅ Waveform service loaded');
