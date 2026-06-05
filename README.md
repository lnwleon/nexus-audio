# NEXUS AUDIO

A cyberpunk-themed, browser-based music player built with vanilla JS and the Web Audio API.

## Features
- 🎵 Multi-track playlist with album art
- 🎛️ Web Audio API equalizer (5 bands, 4 presets)
- 🔀 Shuffle + Repeat (none / one / all)
- 🔊 Volume control + normalize
- ⏩ Crossfade between tracks
- 📊 Frequency visualizer
- 🎨 3 themes: Monochrome, Neon Blue, Cyber Purple
- 💾 Settings & last-played track persisted in `localStorage`
- ⌨️  Keyboard shortcuts: `Space` (play/pause), `←/→` (prev/next), `↑/↓` (volume)

## Setup

> **No build step required.** This is a plain HTML/CSS/JS project.

1. Clone the repo:
   ```bash
   git clone https://github.com/lnwleon/nexus-audio.git
   cd nexus-audio
   ```

2. Serve locally (required for ES modules):
   ```bash
   # Python 3
   python3 -m http.server 8080
   # OR Node.js (npx)
   npx serve .
   ```

3. Open `http://localhost:8080/player.html` in your browser.

## Adding Tracks

Edit `DEMO_TRACKS` in `app.js`:

```js
{
    title:    'My Song',
    artist:   'Artist Name',
    duration: '3:45',
    src:      'audio/my-song.mp3',   // place file in /audio/
    cover:    'https://...'           // URL or local path
}
```

### File naming rules
- No spaces — use hyphens: `My-Song.mp3`
- No double extensions: `Song.mp3` ✅  `Song.mp3.mp3` ❌

## Project Structure
```
nexus-audio/
├── player.html        Player page
├── library.html       Track library
├── system.html        Settings
├── styles.css         Shared stylesheet (NEW — extracted from HTML)
├── app.js             Entry point & playlist
├── audioEngine.js     Web Audio API engine (singleton)
├── router.js          Page initialization & UI logic
├── storage.js         localStorage wrapper
└── audio/             MP3 files
```

## Known Limitations
- No server-side — cannot upload tracks from the browser
- Crossfade is volume-based (gain fade), not a true gapless crossfade
- Battery API (`navigator.getBattery`) is deprecated in some browsers
