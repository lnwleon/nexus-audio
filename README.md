# NEXUS AUDIO - Cyberpunk Music Player

A production-quality, futuristic music player with a monochrome cyberpunk aesthetic.

## Features

- **Global Audio Engine**: Single Audio instance with seamless playback across pages
- **Three Pages**: Player, Library, System
- **Advanced Audio**: Web Audio API with EQ presets, normalization, crossfade
- **Visualizer**: Real-time frequency visualization
- **Themes**: Monochrome, Neon Blue, Cyber Purple
- **Persistent State**: localStorage for settings and last played track
- **Keyboard Shortcuts**: Space to play/pause

## Project Structure

```
/music-app
├── player.html          # Main player interface
├── library.html         # Track library and search
├── system.html          # Settings and system status
├── app.js              # Application entry point
├── audioEngine.js      # Singleton audio management
├── router.js           # Page routing and UI logic
├── storage.js          # localStorage utilities
└── audio/              # Place your music files here
    ├── track1.mp3
    ├── track2.mp3
    └── ...
```

## Setup Instructions

### 1. Add Your Music Files

Create an `audio` folder in the project root and add your MP3 files:

```
/music-app
└── audio/
    ├── track1.mp3
    ├── track2.mp3
    ├── track3.mp3
    └── ...
```

### 2. Update Playlist

Edit `app.js` and modify the `DEMO_TRACKS` array:

```javascript
const DEMO_TRACKS = [
    {
        title: 'YOUR TRACK TITLE',
        artist: 'ARTIST NAME',
        duration: '3:42',
        src: 'audio/your-file.mp3',
        cover: 'https://your-cover-image-url.jpg'
    },
    // Add more tracks...
];
```

### 3. Run Locally

**Option A: Using Python**
```bash
cd music-app
python3 -m http.server 8000
```

**Option B: Using Node.js**
```bash
npm install -g http-server
cd music-app
http-server -p 8000
```

**Option C: Using VS Code Live Server**
- Install "Live Server" extension
- Right-click `player.html`
- Select "Open with Live Server"

### 4. Open in Browser

Navigate to:
```
http://localhost:8000/player.html
```

## Usage

### Player Page
- Click play/pause button or press SPACE
- Click progress bar to seek
- Use next/previous buttons
- Album art and info update automatically

### Library Page
- Search tracks by title or artist
- Click any track to play
- View currently playing track in "Transmission Active"

### System Page
- **Equalizer**: Choose presets (Flat, Bass, Treble, Vocal)
- **Crossfade**: Adjust transition between tracks
- **Normalize**: Prevent volume jumps
- **Themes**: Switch color schemes
- **Visualizer**: Toggle frequency bars

## Code Architecture

### AudioEngine (Singleton)
- Single Audio instance across all pages
- Event-driven architecture
- Web Audio API integration
- EQ, gain, analyzer nodes

### Router
- Page-specific initialization
- UI updates and event binding
- Visualizer management

### Storage
- Persistent settings
- Last played track
- Theme preferences

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (some Web Audio API limitations)

## Notes

- Audio files must be in a supported format (MP3, OGG, WAV)
- Cover images can be local or remote URLs
- Battery API may not be available in all browsers
- Visualizer requires Web Audio API support

## Production Deployment

For production:
1. Minify JavaScript files
2. Optimize images
3. Enable HTTPS for security
4. Consider CDN for assets
5. Add service worker for offline support

## License

MIT
