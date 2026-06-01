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
        if (path.includes('player.html') || path === '/' || path.endsWith('/')) return 'player';
        if (path.includes('library.html')) return 'library';
        if (path.includes('system.html')) return 'system';
        return 'player';
    }

    init() {
        this.applyTheme(Storage.getTheme());

        const settings = Storage.getSettings();
        this.audioEngine.setCrossfade(settings.crossfade);
        this.audioEngine.setNormalize(settings.normalize);
        this.audioEngine.setEqualizer(settings.equalizer);
        this.audioEngine.setVisualizerEnabled(settings.visualizer);
        if (settings.volume !== undefined) {
            this.audioEngine.setVolume(settings.volume);
        }

        switch (this.currentPage) {
            case 'player':  this.initPlayer();  break;
            case 'library': this.initLibrary(); break;
            case 'system':  this.initSystem();  break;
        }

        this.setupKeyboardShortcuts();

        this.audioEngine.on('visualizerchange', (enabled) => {
            enabled ? this.startVisualizer() : this.stopVisualizer();
        });

        if (settings.visualizer) this.startVisualizer();
    }

    initPlayer() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        const prevBtn      = document.getElementById('prev-btn');
        const nextBtn      = document.getElementById('next-btn');
        const progressBar  = document.getElementById('progress-bar');
        const playIcon     = document.getElementById('play-icon');
        const pauseIcon    = document.getElementById('pause-icon');
        const volumeSlider = document.getElementById('volume-slider');
        const shuffleBtn   = document.getElementById('shuffle-btn');
        const repeatBtn    = document.getElementById('repeat-btn');

        if (!playPauseBtn) return; // not on player page

        playPauseBtn.addEventListener('click', () => this.audioEngine.toggle());
        prevBtn.addEventListener('click',      () => this.audioEngine.previous());
        nextBtn.addEventListener('click',      () => this.audioEngine.next());

        // Seek on click
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = ((e.clientX - rect.left) / rect.width) * 100;
            this.audioEngine.seek(percent);
        });

        // Volume
        if (volumeSlider) {
            volumeSlider.value = Math.round(this.audioEngine.getVolume() * 100);
            volumeSlider.addEventListener('input', (e) => {
                this.audioEngine.setVolume(e.target.value / 100);
            });
        }

        // Shuffle
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                const on = this.audioEngine.toggleShuffle();
                shuffleBtn.classList.toggle('active', on);
            });
            // Reflect saved shuffle state
            if (this.audioEngine.getShuffleEnabled()) shuffleBtn.classList.add('active');
        }

        // Repeat
        if (repeatBtn) {
            this._updateRepeatBtn(repeatBtn, this.audioEngine.getRepeatMode());
            repeatBtn.addEventListener('click', () => {
                const mode = this.audioEngine.cycleRepeat();
                this._updateRepeatBtn(repeatBtn, mode);
            });
            this.audioEngine.on('repeatchange', (mode) => this._updateRepeatBtn(repeatBtn, mode));
        }

        // Audio events
        this.audioEngine.on('play',  () => { playIcon.style.display = 'none';  pauseIcon.style.display = 'block'; });
        this.audioEngine.on('pause', () => { playIcon.style.display = 'block'; pauseIcon.style.display = 'none';  });

        this.audioEngine.on('trackloaded', (track) => {
            this.updatePlayerUI(track);
            Storage.saveLastTrack(this.audioEngine.getCurrentIndex());
        });

        this.audioEngine.on('timeupdate', (data) => this.updateProgress(data));

        // BUG FIX: show error toast instead of silently failing
        this.audioEngine.on('error', (msg) => this.showToast(`⚠ ${msg}`, 'error'));

        const currentTrack = this.audioEngine.getCurrentTrack();
        if (currentTrack) {
            this.updatePlayerUI(currentTrack);
            if (this.audioEngine.getIsPlaying()) {
                playIcon.style.display  = 'none';
                pauseIcon.style.display = 'block';
            }
        }
    }

    _updateRepeatBtn(btn, mode) {
        btn.dataset.mode = mode;
        btn.title = mode === 'none' ? 'Repeat off' : mode === 'one' ? 'Repeat one' : 'Repeat all';
        btn.classList.toggle('active', mode !== 'none');
        // Show "1" overlay for repeat-one
        const oneLabel = btn.querySelector('.repeat-one-label');
        if (oneLabel) oneLabel.style.display = mode === 'one' ? 'block' : 'none';
    }

    initLibrary() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;

        this.renderTrackList();
        this.updateNowPlaying();

        searchInput.addEventListener('input', (e) => this.filterTracks(e.target.value));

        this.audioEngine.on('trackloaded', () => this.updateNowPlaying());
        this.audioEngine.on('play',        () => this.updateNowPlaying());
        this.audioEngine.on('pause',       () => this.updateNowPlaying());
    }

    initSystem() {
        // Theme buttons
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                themeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyTheme(btn.dataset.theme);
                Storage.saveTheme(btn.dataset.theme);
            });
        });

        // Visualizer toggle
        const visualizerToggle = document.getElementById('visualizer-toggle');
        if (visualizerToggle) {
            visualizerToggle.addEventListener('click', () => {
                visualizerToggle.classList.toggle('active');
                this.audioEngine.setVisualizerEnabled(visualizerToggle.classList.contains('active'));
                this.saveSettings();
            });
        }

        // Normalize toggle
        const normalizeToggle = document.getElementById('normalize-toggle');
        if (normalizeToggle) {
            normalizeToggle.addEventListener('click', () => {
                normalizeToggle.classList.toggle('active');
                this.audioEngine.setNormalize(normalizeToggle.classList.contains('active'));
                this.saveSettings();
            });
        }

        // Crossfade slider
        const crossfadeSlider = document.getElementById('crossfade-slider');
        const crossfadeValue  = document.getElementById('crossfade-value');
        if (crossfadeSlider) {
            crossfadeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                crossfadeValue.textContent = `${value}s`;
                this.audioEngine.setCrossfade(value);
                this.saveSettings();
            });
        }

        // EQ presets
        document.querySelectorAll('.eq-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                document.querySelectorAll('.eq-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
                this.audioEngine.setEqualizer(preset.dataset.preset);
                this.saveSettings();
            });
        });

        this.loadSystemSettings();
        this.updateBatteryStatus();

        // Real storage usage (NEW)
        this.updateStorageStatus();
    }

    renderTrackList(tracks = null) {
        const trackList = document.getElementById('track-list');
        if (!trackList) return;

        const playlist = tracks || this.audioEngine.getPlaylist();
        const currentIndex = this.audioEngine.getCurrentIndex();

        if (playlist.length === 0) {
            trackList.innerHTML = `<p class="text-sm opacity-40 tracking-wide p-4">NO TRACKS FOUND</p>`;
            return;
        }

        trackList.innerHTML = playlist.map((track, index) => `
            <div class="track-card p-4 flex items-center gap-4 ${index === currentIndex ? 'active' : ''}" data-index="${index}">
                <img src="${track.cover}" alt="${track.title}" class="track-thumbnail object-cover" loading="lazy">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm tracking-wide glow-text truncate">${track.title}</h4>
                    <p class="text-xs opacity-60 mt-1 truncate">${track.artist}</p>
                </div>
                <span class="text-xs opacity-60 shrink-0">${track.duration}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="opacity-60 shrink-0">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>
        `).join('');

        trackList.querySelectorAll('.track-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                this.audioEngine.loadTrack(index);
                this.audioEngine.play();
                // Navigate to player after selecting
                setTimeout(() => { window.location.href = 'player.html'; }, 300);
            });
        });
    }

    filterTracks(query) {
        const playlist = this.audioEngine.getPlaylist();
        if (query.trim() === '') {
            this.renderTrackList();
            return;
        }
        const filtered = playlist.filter(track =>
            `${track.title} ${track.artist}`.toLowerCase().includes(query.toLowerCase())
        );
        this.renderTrackList(filtered);
    }

    updateNowPlaying() {
        const container = document.getElementById('now-playing-container');
        if (!container) return;

        const currentTrack = this.audioEngine.getCurrentTrack();
        const isPlaying    = this.audioEngine.getIsPlaying();

        if (!currentTrack) {
            container.innerHTML = `
                <div class="border border-white border-opacity-20 p-6 flex items-center gap-6">
                    <p class="text-sm opacity-40 tracking-wide">NO ACTIVE TRANSMISSION</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="border border-white border-opacity-20 p-6 flex items-center gap-6 track-card" data-goto-player="true" style="cursor:pointer">
                <img src="${currentTrack.cover}" alt="${currentTrack.title}" class="track-thumbnail object-cover glow" loading="lazy">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm tracking-wide glow-text truncate">${currentTrack.title}</h4>
                    <p class="text-xs opacity-60 mt-1 truncate">${currentTrack.artist}</p>
                </div>
                <span class="text-xs opacity-60 shrink-0">${currentTrack.duration}</span>
                ${isPlaying ? '<span class="text-xs glow-text live-indicator shrink-0">● LIVE</span>' : ''}
            </div>`;

        container.querySelector('[data-goto-player]').addEventListener('click', () => {
            window.location.href = 'player.html';
        });
    }

    updatePlayerUI(track) {
        const albumImg   = document.getElementById('album-img');
        const trackTitle = document.getElementById('track-title');
        const trackArtist= document.getElementById('track-artist');

        if (albumImg)    albumImg.src           = track.cover;
        if (trackTitle)  trackTitle.textContent  = track.title;
        if (trackArtist) trackArtist.textContent = track.artist;

        // Update document title for media notifications
        document.title = `${track.title} — ${track.artist} // NEXUS AUDIO`;
    }

    updateProgress(data) {
        const progressFill  = document.getElementById('progress-fill');
        const currentTime   = document.getElementById('current-time');
        const remainingTime = document.getElementById('remaining-time');

        if (!progressFill || isNaN(data.duration)) return;

        const percent = (data.currentTime / data.duration) * 100;
        progressFill.style.width = `${percent}%`;

        if (currentTime)   currentTime.textContent   = this.formatTime(data.currentTime);
        if (remainingTime) remainingTime.textContent  = `-${this.formatTime(data.duration - data.currentTime)}`;
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.audioEngine.toggle();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.audioEngine.next();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.audioEngine.previous();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.audioEngine.setVolume(Math.min(1, this.audioEngine.getVolume() + 0.1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.audioEngine.setVolume(Math.max(0, this.audioEngine.getVolume() - 0.1));
                    break;
            }
        });
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme || 'monochrome');
    }

    saveSettings() {
        Storage.saveSettings({
            crossfade:  this.audioEngine.settings.crossfade,
            normalize:  this.audioEngine.settings.normalize,
            equalizer:  this.audioEngine.settings.equalizer,
            visualizer: this.audioEngine.settings.visualizer,
            volume:     this.audioEngine.settings.volume
        });
    }

    loadSystemSettings() {
        const settings = Storage.getSettings();

        const crossfadeSlider = document.getElementById('crossfade-slider');
        const crossfadeValue  = document.getElementById('crossfade-value');
        if (crossfadeSlider) {
            crossfadeSlider.value       = settings.crossfade;
            crossfadeValue.textContent  = `${settings.crossfade}s`;
        }

        const normalizeToggle = document.getElementById('normalize-toggle');
        if (normalizeToggle && settings.normalize) normalizeToggle.classList.add('active');

        const visualizerToggle = document.getElementById('visualizer-toggle');
        if (visualizerToggle && settings.visualizer) visualizerToggle.classList.add('active');

        document.querySelectorAll('.eq-preset').forEach(preset => {
            preset.classList.toggle('active', preset.dataset.preset === settings.equalizer);
        });

        const currentTheme = Storage.getTheme();
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === currentTheme);
        });
    }

    async updateBatteryStatus() {
        const batteryLevel = document.getElementById('battery-level');
        const batteryBar   = document.getElementById('battery-bar');
        if (!batteryLevel) return;

        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                const update = () => {
                    const pct = Math.round(battery.level * 100);
                    batteryLevel.textContent = `${pct}%`;
                    if (batteryBar) batteryBar.style.width = `${pct}%`;
                };
                update();
                battery.addEventListener('levelchange', update);
            } else {
                batteryLevel.textContent = 'N/A';
                if (batteryBar) batteryBar.style.width = '100%';
            }
        } catch {
            batteryLevel.textContent = 'N/A';
        }
    }

    // NEW: show real storage quota if available
    async updateStorageStatus() {
        const storagePercent = document.getElementById('storage-percent');
        const storageBar     = document.getElementById('storage-bar');
        if (!storagePercent) return;

        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const { usage, quota } = await navigator.storage.estimate();
                const pct = quota ? Math.round((usage / quota) * 100) : 0;
                storagePercent.textContent = `${pct}%`;
                if (storageBar) storageBar.style.width = `${pct}%`;
            }
        } catch {
            // Fallback already shown in HTML
        }
    }

    showToast(message, type = 'info') {
        let toast = document.getElementById('nexus-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'nexus-toast';
            toast.style.cssText = `
                position: fixed; bottom: 140px; left: 50%; transform: translateX(-50%);
                background: var(--bg); border: 1px solid var(--primary);
                color: var(--primary); padding: 10px 24px;
                font-family: 'Courier New', monospace; font-size: 12px;
                letter-spacing: 0.1em; z-index: 9999;
                box-shadow: 0 0 20px var(--glow); opacity: 0;
                transition: opacity 0.3s;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }

    startVisualizer() {
        const canvas = document.getElementById('visualizer-canvas');
        if (!canvas) return;

        this.visualizerActive = true;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = 120;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            if (!this.visualizerActive) return;

            const data = this.audioEngine.getAnalyserData();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (data) {
                const barWidth = (canvas.width / data.length) * 2;
                let x = 0;
                const color = getComputedStyle(document.documentElement)
                    .getPropertyValue('--primary').trim() || '#ffffff';

                for (let i = 0; i < data.length; i++) {
                    const barHeight = (data[i] / 255) * canvas.height;
                    ctx.fillStyle = color;
                    ctx.fillRect(x, canvas.height - barHeight, Math.max(1, barWidth - 2), barHeight);
                    x += barWidth;
                }
            }

            this.animationFrame = requestAnimationFrame(draw);
        };

        draw();
    }

    stopVisualizer() {
        this.visualizerActive = false;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

        const canvas = document.getElementById('visualizer-canvas');
        if (canvas) {
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

export default Router;
