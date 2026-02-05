// Singleton Audio Engine - manages all audio playback
class AudioEngine {
    constructor() {
        if (AudioEngine.instance) {
            return AudioEngine.instance;
        }

        this.audio = new Audio();
        this.currentTrack = null;
        this.currentIndex = -1;
        this.playlist = [];
        this.isPlaying = false;
        this.listeners = new Map();
        
        // Audio context for advanced features
        this.audioContext = null;
        this.analyser = null;
        this.gainNode = null;
        this.eqNodes = [];
        this.sourceNode = null;

        // Settings
        this.settings = {
            crossfade: 0,
            normalize: false,
            equalizer: 'flat',
            visualizer: false
        };

        this.initializeAudioContext();
        this.setupEventListeners();
        
        AudioEngine.instance = this;
    }

    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.gainNode = this.audioContext.createGain();

            // Create EQ nodes (5 bands)
            const frequencies = [60, 250, 1000, 4000, 12000];
            frequencies.forEach(freq => {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1;
                filter.gain.value = 0;
                this.eqNodes.push(filter);
            });

            // Connect nodes
            this.gainNode.connect(this.eqNodes[0]);
            for (let i = 0; i < this.eqNodes.length - 1; i++) {
                this.eqNodes[i].connect(this.eqNodes[i + 1]);
            }
            this.eqNodes[this.eqNodes.length - 1].connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

        } catch (e) {
            console.warn('Web Audio API not available:', e);
        }
    }

    setupEventListeners() {
        // Track ended - play next
        this.audio.addEventListener('ended', () => {
            this.next();
        });

        // Time update
        this.audio.addEventListener('timeupdate', () => {
            this.emit('timeupdate', {
                currentTime: this.audio.currentTime,
                duration: this.audio.duration
            });
        });

        // Can play
        this.audio.addEventListener('canplay', () => {
            this.emit('canplay');
        });

        // Error handling
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.emit('error', e);
        });
    }

    connectAudioElement() {
        if (!this.audioContext || this.sourceNode) return;

        try {
            this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
            this.sourceNode.connect(this.gainNode);
        } catch (e) {
            console.warn('Could not connect audio element:', e);
        }
    }

    setPlaylist(tracks) {
        this.playlist = tracks;
    }

    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;

        const track = this.playlist[index];
        this.currentTrack = track;
        this.currentIndex = index;
        
        this.audio.src = track.src;
        this.audio.load();

        // Connect to audio context on first load
        if (!this.sourceNode && this.audioContext) {
            this.connectAudioElement();
        }

        // Apply normalize if enabled
        if (this.settings.normalize && this.gainNode) {
            this.gainNode.gain.value = 0.8;
        }

        this.emit('trackloaded', track);
    }

    async play() {
        if (!this.audio.src) return;

        try {
            // Resume audio context if suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            await this.audio.play();
            this.isPlaying = true;
            this.emit('play');
        } catch (e) {
            console.error('Play error:', e);
        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.emit('pause');
    }

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    next() {
        const nextIndex = (this.currentIndex + 1) % this.playlist.length;
        this.loadTrack(nextIndex);
        this.play();
    }

    previous() {
        const prevIndex = this.currentIndex === 0 
            ? this.playlist.length - 1 
            : this.currentIndex - 1;
        this.loadTrack(prevIndex);
        this.play();
    }

    seek(percent) {
        if (this.audio.duration) {
            this.audio.currentTime = (percent / 100) * this.audio.duration;
        }
    }

    setVolume(value) {
        this.audio.volume = Math.max(0, Math.min(1, value));
    }

    // Settings
    setCrossfade(seconds) {
        this.settings.crossfade = seconds;
    }

    setNormalize(enabled) {
        this.settings.normalize = enabled;
        if (this.gainNode) {
            this.gainNode.gain.value = enabled ? 0.8 : 1.0;
        }
    }

    setEqualizer(preset) {
        this.settings.equalizer = preset;
        
        if (!this.eqNodes.length) return;

        // Reset all bands
        this.eqNodes.forEach(node => node.gain.value = 0);

        // Apply preset
        switch (preset) {
            case 'bass':
                this.eqNodes[0].gain.value = 8;  // 60Hz
                this.eqNodes[1].gain.value = 5;  // 250Hz
                break;
            case 'treble':
                this.eqNodes[3].gain.value = 6;  // 4kHz
                this.eqNodes[4].gain.value = 8;  // 12kHz
                break;
            case 'vocal':
                this.eqNodes[2].gain.value = 6;  // 1kHz
                this.eqNodes[3].gain.value = 4;  // 4kHz
                break;
            case 'flat':
            default:
                // All at 0
                break;
        }
    }

    setVisualizerEnabled(enabled) {
        this.settings.visualizer = enabled;
        this.emit('visualizerchange', enabled);
    }

    getAnalyserData() {
        if (!this.analyser) return null;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => callback(data));
    }

    // Get current state
    getCurrentTrack() {
        return this.currentTrack;
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    getPlaylist() {
        return this.playlist;
    }

    getIsPlaying() {
        return this.isPlaying;
    }
}

export default AudioEngine;
