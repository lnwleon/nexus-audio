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

        // Shuffle & repeat state (NEW)
        this.shuffleEnabled = false;
        this.repeatMode = 'none'; // 'none' | 'one' | 'all'
        this.shuffleHistory = [];

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
            visualizer: false,
            volume: 1
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

            // Chain: gainNode -> eq[0] -> ... -> eq[n] -> analyser -> destination
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
        this.audio.addEventListener('ended', () => {
            if (this.settings.crossfade > 0) return; // crossfade handles this
            this._handleTrackEnd();
        });

        this.audio.addEventListener('timeupdate', () => {
            const { currentTime, duration } = this.audio;

            // Crossfade: start fading out near end of track
            if (this.settings.crossfade > 0 && duration && !isNaN(duration)) {
                const timeLeft = duration - currentTime;
                if (timeLeft <= this.settings.crossfade && timeLeft > 0) {
                    const fadeRatio = timeLeft / this.settings.crossfade;
                    if (this.gainNode) this.gainNode.gain.value = this.settings.normalize ? 0.8 * fadeRatio : fadeRatio;
                }
                // Trigger next track slightly before end
                if (timeLeft <= this.settings.crossfade / 2 && !this._crossfadeTriggered) {
                    this._crossfadeTriggered = true;
                    this._handleTrackEnd();
                }
            }

            this.emit('timeupdate', { currentTime, duration });
        });

        this.audio.addEventListener('canplay', () => this.emit('canplay'));

        // BUG FIX: emit a useful error message instead of the raw event object
        this.audio.addEventListener('error', () => {
            const err = this.audio.error;
            const msg = err ? `MediaError code ${err.code}: ${err.message || 'unknown'}` : 'Unknown audio error';
            console.error('Audio error:', msg);
            this.emit('error', msg);
        });

        // Volume change sync
        this.audio.addEventListener('volumechange', () => {
            this.settings.volume = this.audio.volume;
            this.emit('volumechange', this.audio.volume);
        });
    }

    _handleTrackEnd() {
        this._crossfadeTriggered = false;
        // Restore gain before loading next
        if (this.gainNode) {
            this.gainNode.gain.value = this.settings.normalize ? 0.8 : 1.0;
        }

        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else if (this.shuffleEnabled) {
            this._playShuffleNext();
        } else {
            if (this.repeatMode === 'all' || this.currentIndex < this.playlist.length - 1) {
                this.next();
            } else {
                // End of playlist, no repeat
                this.isPlaying = false;
                this.emit('pause');
            }
        }
    }

    _playShuffleNext() {
        if (this.playlist.length <= 1) { this.next(); return; }
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * this.playlist.length);
        } while (nextIndex === this.currentIndex);
        this.loadTrack(nextIndex);
        this.play();
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
        this._crossfadeTriggered = false;

        this.audio.src = track.src;
        this.audio.load();

        if (!this.sourceNode && this.audioContext) {
            this.connectAudioElement();
        }

        if (this.gainNode) {
            this.gainNode.gain.value = this.settings.normalize ? 0.8 : 1.0;
        }

        this.emit('trackloaded', track);
    }

    async play() {
        if (!this.audio.src) return;

        try {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            await this.audio.play();
            this.isPlaying = true;
            this.emit('play');
        } catch (e) {
            console.error('Play error:', e);
            this.emit('error', e.message);
        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.emit('pause');
    }

    toggle() {
        this.isPlaying ? this.pause() : this.play();
    }

    next() {
        const nextIndex = (this.currentIndex + 1) % this.playlist.length;
        this.loadTrack(nextIndex);
        this.play();
    }

    previous() {
        // If more than 3s in, restart current track; otherwise go to previous
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }
        const prevIndex = this.currentIndex === 0
            ? this.playlist.length - 1
            : this.currentIndex - 1;
        this.loadTrack(prevIndex);
        this.play();
    }

    seek(percent) {
        if (this.audio.duration && !isNaN(this.audio.duration)) {
            this.audio.currentTime = (percent / 100) * this.audio.duration;
        }
    }

    setVolume(value) {
        this.audio.volume = Math.max(0, Math.min(1, value));
        this.settings.volume = this.audio.volume;
    }

    getVolume() {
        return this.audio.volume;
    }

    // Shuffle & Repeat (NEW)
    toggleShuffle() {
        this.shuffleEnabled = !this.shuffleEnabled;
        this.emit('shufflechange', this.shuffleEnabled);
        return this.shuffleEnabled;
    }

    cycleRepeat() {
        const modes = ['none', 'one', 'all'];
        const idx = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(idx + 1) % modes.length];
        this.emit('repeatchange', this.repeatMode);
        return this.repeatMode;
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

        this.eqNodes.forEach(node => { node.gain.value = 0; });

        switch (preset) {
            case 'bass':
                this.eqNodes[0].gain.value = 8;
                this.eqNodes[1].gain.value = 5;
                break;
            case 'treble':
                this.eqNodes[3].gain.value = 6;
                this.eqNodes[4].gain.value = 8;
                break;
            case 'vocal':
                this.eqNodes[2].gain.value = 6;
                this.eqNodes[3].gain.value = 4;
                break;
            case 'flat':
            default:
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
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(cb => cb(data));
    }

    getCurrentTrack() { return this.currentTrack; }
    getCurrentIndex() { return this.currentIndex; }
    getPlaylist() { return this.playlist; }
    getIsPlaying() { return this.isPlaying; }
    getShuffleEnabled() { return this.shuffleEnabled; }
    getRepeatMode() { return this.repeatMode; }
}

export default AudioEngine;
