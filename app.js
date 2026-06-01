// Main application entry point
import AudioEngine from './audioEngine.js';
import Router from './router.js';
import Storage from './storage.js';

// Demo playlist - audio files must be in /audio/ folder
// BUG FIX: corrected src paths to match actual filenames (no spaces, no double .mp3)
// BUG FIX: fixed "Set-Me-Free.m3" typo -> "Set-Me-Free.mp3"
// BUG FIX: removed leading space in ' Set Me Free' title
const DEMO_TRACKS = [
    {
        title: 'Feel My Love',
        artist: 'Sauti Sol',
        duration: '3:57',
        src: 'audio/Feel-My-Love.mp3',
        cover: 'https://fastly-s3.allmusic.com/release/mr0005237449/front/400/3jm4C93At0K9M0H6JOWidt_M69_UI9rrJSVvWL2-yAg=.jpg'
    },
    {
        title: 'Intro',
        artist: 'Sauti Sol',
        duration: '1:10',
        src: 'audio/Intro.mp3',
        cover: 'https://fastly-s3.allmusic.com/release/mr0005237449/front/400/3jm4C93At0K9M0H6JOWidt_M69_UI9rrJSVvWL2-yAg=.jpg'
    },
    {
        title: 'Midnight Train',
        artist: 'Sauti Sol',
        duration: '3:52',
        src: 'audio/Midnight-Train.mp3',
        cover: 'https://fastly-s3.allmusic.com/release/mr0005237449/front/400/3jm4C93At0K9M0H6JOWidt_M69_UI9rrJSVvWL2-yAg=.jpg'
    },
    {
        title: 'Nenda Lote',
        artist: 'Sauti Sol',
        duration: '4:24',
        src: 'audio/Nenda-Lote.mp3',
        cover: 'https://fastly-s3.allmusic.com/release/mr0005237449/front/400/3jm4C93At0K9M0H6JOWidt_M69_UI9rrJSVvWL2-yAg=.jpg'
    },
    {
        title: 'Set Me Free',
        artist: 'Sauti Sol',
        duration: '2:31',
        src: 'audio/Set-Me-Free.mp3',
        cover: 'https://fastly-s3.allmusic.com/release/mr0005237449/front/400/3jm4C93At0K9M0H6JOWidt_M69_UI9rrJSVvWL2-yAg=.jpg'
    },
    {
        title: 'Sober',
        artist: 'Sauti Sol',
        duration: '3:20',
        src: 'audio/Sober.mp3',
        cover: 'https://fastly-s3.allmusic.com/release/mr0005237449/front/400/3jm4C93At0K9M0H6JOWidt_M69_UI9rrJSVvWL2-yAg=.jpg'
    }
];

class App {
    constructor() {
        this.audioEngine = new AudioEngine();
        this.router = new Router();
        this.init();
    }

    init() {
        // Set playlist
        this.audioEngine.setPlaylist(DEMO_TRACKS);

        // Load last played track if exists
        const lastTrack = Storage.getLastTrack();
        if (lastTrack && lastTrack.index >= 0 && lastTrack.index < DEMO_TRACKS.length) {
            this.audioEngine.loadTrack(lastTrack.index);
        } else {
            this.audioEngine.loadTrack(0);
        }

        // Initialize router
        this.router.init();
    }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}
