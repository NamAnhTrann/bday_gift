import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-homepage',
  imports:[], 
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.css']
})
export class Homepage implements OnInit {
  // --- Background music (auto-cycling, no controls) ---

  constructor(private router:Router){}

  miniGameBtn(){
    this.router.navigate(["/mini-game"])
  }

  flip1 = signal(false);
  flip2 = signal(false);

  toggle1() {
    this.flip1.update(v => !v);
  }

  toggle2() {
    this.flip2.update(v => !v);
  }
  private audio = new Audio();
  songs: string[] = [
    'assets/audio/01_song.mp3',
    'assets/audio/02_song.mp3',
    'assets/audio/03_song.mp3',
    // ... up to 10–15 tracks
  ];
  private i = 0;
  showPlayHint = signal(false);

  // UI signals
  showGift = signal(false);

  ngOnInit(): void {
    // music setup
    this.audio.preload = 'auto';
    this.audio.loop = false;
    this.audio.volume = 0.6;
    this.audio.addEventListener('ended', () => this.next());
    this.load(this.i);
    this.tryAutoplay();

    // first-gesture fallback for autoplay
    const gestureStart = () => {
      this.play().finally(() => {
        this.showPlayHint.set(false);
        window.removeEventListener('pointerdown', gestureStart);
        window.removeEventListener('keydown', gestureStart);
        window.removeEventListener('touchstart', gestureStart);
      });
    };
    window.addEventListener('pointerdown', gestureStart, { once: true });
    window.addEventListener('keydown', gestureStart, { once: true });
    window.addEventListener('touchstart', gestureStart, { once: true });
  }

  private load(index: number) {
    if (!this.songs.length) return;
    this.i = ((index % this.songs.length) + this.songs.length) % this.songs.length;
    this.audio.src = this.songs[this.i];
    this.audio.load();
  }
  private async tryAutoplay() {
    try { await this.audio.play(); this.showPlayHint.set(false); }
    catch { this.showPlayHint.set(true); }
  }
  private async play() {
    try { await this.audio.play(); } catch { this.showPlayHint.set(true); }
  }
  private next() { this.load(this.i + 1); this.play(); }

  // UI actions
  scrollTo(id: string) { document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' }); }
}
