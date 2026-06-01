// Storage utility for managing app state in localStorage
class Storage {
    static KEYS = {
        LAST_TRACK: 'nexus_last_track',
        SETTINGS:   'nexus_settings',
        THEME:      'nexus_theme'
    };

    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            // Quota exceeded or private browsing - silently degrade
            console.warn('Storage save failed:', e.name);
        }
    }

    static load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data !== null ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.warn('Storage load failed:', e.name);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Storage remove failed:', e.name);
        }
    }

    // BUG FIX: was checking data !== null before but then checking data ? which
    // would miss falsy values like 0. Now using strict null check in load().

    static saveLastTrack(index) {
        this.save(this.KEYS.LAST_TRACK, { index, timestamp: Date.now() });
    }

    static getLastTrack() {
        return this.load(this.KEYS.LAST_TRACK);
    }

    static saveSettings(settings) {
        this.save(this.KEYS.SETTINGS, settings);
    }

    static getSettings() {
        return this.load(this.KEYS.SETTINGS, {
            crossfade:  0,
            normalize:  false,
            equalizer:  'flat',
            visualizer: false,
            volume:     1
        });
    }

    static saveTheme(theme) {
        this.save(this.KEYS.THEME, theme);
    }

    static getTheme() {
        return this.load(this.KEYS.THEME, 'monochrome');
    }

    // NEW: wipe all app data
    static clearAll() {
        Object.values(this.KEYS).forEach(key => this.remove(key));
    }
}

export default Storage;
