// Router - handles page-specific initialization
import AudioEngine from './audioEngine.js';
import Storage from './storage.js';

class Router {
    constructor() {
        this.audioEngine = new AudioEngine();
        this.currentPage = this.getCurrentPage();
        this.visualizerActive = false;
        this.animationFrame = null;
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('player.html')) return 'player';
        if (path.includes('library.html')) return 'library';
        if (path.includes('system.html')) return 'system';
        return 'player';
    }

    init() {
        // Apply saved theme
        this.applyTheme(Storage.getTheme());

        // Load saved settings
        const settings = Storage.getSettings();
        this.audioEngine.setCrossfade(settings.crossfade);
        this.audioEngine.setNormalize(settings.normalize);
        this.audioEngine.setEqualizer(settings.equalizer);
        this.audioEngine.setVisualizerEnabled(settings.visualizer);

        // Route to correct page handler
        switch (this.currentPage) {
            case 'player':
                this.initPlayer();
                break;
            case 'library':
                this.initLibrary();
                break;
            case 'system':
                this.initSystem();
                break;
        }

        // Setup keyboard shortcuts (global)
        this.setupKeyboardShortcuts();

        // Setup visualizer listener
        this.audioEngine.on('visualizerchange', (enabled) => {
            if (enabled) {
                this.startVisualizer();
            } else {
                this.stopVisualizer();
            }
        });

        // Start visualizer if enabled
        if (settings.visualizer) {
            this.startVisualizer();
        }
    }

    initPlayer() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const progressBar = document.getElementById('progress-bar');
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');

        // Play/Pause
        playPauseBtn.addEventListener('click', () => {
            this.audioEngine.toggle();
        });

        // Previous
        prevBtn.addEventListener('click', () => {
            this.audioEngine.previous();
        });

        // Next
        nextBtn.addEventListener('click', () => {
            this.audioEngine.next();
        });

        // Seek
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = ((e.clientX - rect.left) / rect.width) * 100;
            this.audioEngine.seek(percent);
        });

        // Listen to audio events
        this.audioEngine.on('play', () => {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        });

        this.audioEngine.on('pause', () => {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        });

        this.audioEngine.on('trackloaded', (track) => {
            this.updatePlayerUI(track);
            Storage.saveLastTrack(this.audioEngine.getCurrentIndex());
        });

        this.audioEngine.on('timeupdate', (data) => {
            this.updateProgress(data);
        });

        // Update UI with current track
        const currentTrack = this.audioEngine.getCurrentTrack();
        if (currentTrack) {
            this.updatePlayerUI(currentTrack);
            
            if (this.audioEngine.getIsPlaying()) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            }
        }
    }

    initLibrary() {
        const searchInput = document.getElementById('search-input');
        const trackList = document.getElementById('track-list');

        // Render all tracks
        this.renderTrackList();

        // Update now playing
        this.updateNowPlaying();

        // Search functionality
        searchInput.addEventListener('input', (e) => {
            this.filterTracks(e.target.value);
        });

        // Listen for track changes
        this.audioEngine.on('trackloaded', () => {
            this.updateNowPlaying();
        });

        this.audioEngine.on('play', () => {
            this.updateNowPlaying();
        });
    }

    initSystem() {
        // Theme buttons
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                themeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const theme = btn.dataset.theme;
                this.applyTheme(theme);
                Storage.saveTheme(theme);
            });
        });

        // Visualizer toggle
        const visualizerToggle = document.getElementById('visualizer-toggle');
        visualizerToggle.addEventListener('click', () => {
            visualizerToggle.classList.toggle('active');
            const enabled = visualizerToggle.classList.contains('active');
            this.audioEngine.setVisualizerEnabled(enabled);
            this.saveSettings();
        });

        // Normalize toggle
        const normalizeToggle = document.getElementById('normalize-toggle');
        normalizeToggle.addEventListener('click', () => {
            normalizeToggle.classList.toggle('active');
            const enabled = normalizeToggle.classList.contains('active');
            this.audioEngine.setNormalize(enabled);
            this.saveSettings();
        });

        // Crossfade slider
        const crossfadeSlider = document.getElementById('crossfade-slider');
        const crossfadeValue = document.getElementById('crossfade-value');
        crossfadeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            crossfadeValue.textContent = `${value}s`;
            this.audioEngine.setCrossfade(value);
            this.saveSettings();
        });

        // EQ presets
        const eqPresets = document.querySelectorAll('.eq-preset');
        eqPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                eqPresets.forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
                const presetName = preset.dataset.preset;
                this.audioEngine.setEqualizer(presetName);
                this.saveSettings();
            });
        });

        // Load saved settings into UI
        this.loadSystemSettings();

        // Battery status
        this.updateBatteryStatus();
    }

    renderTrackList(tracks = null) {
        const trackList = document.getElementById('track-list');
        const playlist = tracks || this.audioEngine.getPlaylist();

        trackList.innerHTML = playlist.map((track, index) => `
            <div class="track-card p-4 flex items-center gap-4" data-index="${index}">
                <img src="${track.cover}" alt="${track.title}" class="track-thumbnail object-cover">
                <div class="flex-1">
                    <h4 class="text-sm tracking-wide glow-text">${track.title}</h4>
                    <p class="text-xs opacity-60 mt-1">${track.artist}</p>
                </div>
                <span class="text-xs opacity-60">${track.duration}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="opacity-60">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>
        `).join('');

        // Add click handlers
        trackList.querySelectorAll('.track-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                this.audioEngine.loadTrack(index);
                this.audioEngine.play();
                // Navigate to player
                // window.location.href = 'player.html';
            });
        });
    }

    filterTracks(query) {
        const playlist = this.audioEngine.getPlaylist();
        const filtered = playlist.filter(track => {
            const searchText = `${track.title} ${track.artist}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });

        if (query.trim() === '') {
            this.renderTrackList();
        } else {
            this.renderTrackList(filtered);
        }
    }

    updateNowPlaying() {
        const container = document.getElementById('now-playing-container');
        const currentTrack = this.audioEngine.getCurrentTrack();
        const isPlaying = this.audioEngine.getIsPlaying();

        if (!currentTrack) {
            container.innerHTML = `
                <div class="border border-white border-opacity-20 p-6 flex items-center gap-6">
                    <p class="text-sm opacity-40 tracking-wide">NO ACTIVE TRANSMISSION</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="border border-white border-opacity-20 p-6 flex items-center gap-6 track-card" data-goto-player="true">
                <img src="${currentTrack.cover}" alt="${currentTrack.title}" class="track-thumbnail object-cover glow">
                <div class="flex-1">
                    <h4 class="text-sm tracking-wide glow-text">${currentTrack.title}</h4>
                    <p class="text-xs opacity-60 mt-1">${currentTrack.artist}</p>
                </div>
                <span class="text-xs opacity-60">${currentTrack.duration}</span>
                ${isPlaying ? '<span class="text-xs glow-text live-indicator">● LIVE</span>' : ''}
            </div>
        `;

        // Click to go to player
        container.querySelector('[data-goto-player]').addEventListener('click', () => {
            window.location.href = 'player.html';
        });
    }

    updatePlayerUI(track) {
        const albumImg = document.getElementById('album-img');
        const trackTitle = document.getElementById('track-title');
        const trackArtist = document.getElementById('track-artist');

        if (albumImg) albumImg.src = track.cover;
        if (trackTitle) trackTitle.textContent = track.title;
        if (trackArtist) trackArtist.textContent = track.artist;
    }

    updateProgress(data) {
        const progressFill = document.getElementById('progress-fill');
        const currentTime = document.getElementById('current-time');
        const remainingTime = document.getElementById('remaining-time');

        if (!progressFill) return;

        const percent = (data.currentTime / data.duration) * 100;
        progressFill.style.width = `${percent}%`;

        if (currentTime) {
            currentTime.textContent = this.formatTime(data.currentTime);
        }

        if (remainingTime) {
            const remaining = data.duration - data.currentTime;
            remainingTime.textContent = `-${this.formatTime(remaining)}`;
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.audioEngine.toggle();
            }
        });
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    saveSettings() {
        Storage.saveSettings({
            crossfade: this.audioEngine.settings.crossfade,
            normalize: this.audioEngine.settings.normalize,
            equalizer: this.audioEngine.settings.equalizer,
            visualizer: this.audioEngine.settings.visualizer
        });
    }

    loadSystemSettings() {
        const settings = Storage.getSettings();

        // Crossfade
        const crossfadeSlider = document.getElementById('crossfade-slider');
        const crossfadeValue = document.getElementById('crossfade-value');
        if (crossfadeSlider) {
            crossfadeSlider.value = settings.crossfade;
            crossfadeValue.textContent = `${settings.crossfade}s`;
        }

        // Normalize
        const normalizeToggle = document.getElementById('normalize-toggle');
        if (normalizeToggle && settings.normalize) {
            normalizeToggle.classList.add('active');
        }

        // Visualizer
        const visualizerToggle = document.getElementById('visualizer-toggle');
        if (visualizerToggle && settings.visualizer) {
            visualizerToggle.classList.add('active');
        }

        // EQ
        const eqPresets = document.querySelectorAll('.eq-preset');
        eqPresets.forEach(preset => {
            if (preset.dataset.preset === settings.equalizer) {
                preset.classList.add('active');
            }
        });

        // Theme
        const themeButtons = document.querySelectorAll('.theme-btn');
        const currentTheme = Storage.getTheme();
        themeButtons.forEach(btn => {
            if (btn.dataset.theme === currentTheme) {
                btn.classList.add('active');
            }
        });
    }

    async updateBatteryStatus() {
        const batteryLevel = document.getElementById('battery-level');
        const batteryBar = document.getElementById('battery-bar');

        if (!batteryLevel) return;

        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                const percent = Math.round(battery.level * 100);
                batteryLevel.textContent = `${percent}%`;
                batteryBar.style.width = `${percent}%`;

                battery.addEventListener('levelchange', () => {
                    const newPercent = Math.round(battery.level * 100);
                    batteryLevel.textContent = `${newPercent}%`;
                    batteryBar.style.width = `${newPercent}%`;
                });
            } else {
                batteryLevel.textContent = '100%';
                batteryBar.style.width = '100%';
            }
        } catch (e) {
            batteryLevel.textContent = '100%';
            batteryBar.style.width = '100%';
        }
    }

    startVisualizer() {
        const canvas = document.getElementById('visualizer-canvas');
        if (!canvas) return;

        this.visualizerActive = true;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = 120;

        const draw = () => {
            if (!this.visualizerActive) return;

            const data = this.audioEngine.getAnalyserData();
            if (!data) {
                this.animationFrame = requestAnimationFrame(draw);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / data.length) * 2;
            let x = 0;

            const color = getComputedStyle(document.documentElement)
                .getPropertyValue('--primary').trim() || '#ffffff';

            for (let i = 0; i < data.length; i++) {
                const barHeight = (data[i] / 255) * canvas.height;

                ctx.fillStyle = color;
                ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

                x += barWidth;
            }

            this.animationFrame = requestAnimationFrame(draw);
        };

        draw();
    }

    stopVisualizer() {
        this.visualizerActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        const canvas = document.getElementById('visualizer-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

export default Router;
