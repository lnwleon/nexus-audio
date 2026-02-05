// Storage utility for managing app state in localStorage
class Storage {
    static KEYS = {
        LAST_TRACK: 'nexus_last_track',
        SETTINGS: 'nexus_settings',
        THEME: 'nexus_theme'
    };

    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Storage save error:', e);
        }
    }

    static load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Storage load error:', e);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Storage remove error:', e);
        }
    }

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
            crossfade: 0,
            normalize: false,
            equalizer: 'flat',
            visualizer: false
        });
    }

    static saveTheme(theme) {
        this.save(this.KEYS.THEME, theme);
    }

    static getTheme() {
        return this.load(this.KEYS.THEME, 'monochrome');
    }
}

export default Storage;
