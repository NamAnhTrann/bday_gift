import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  protected readonly title = signal('bday_gift');

  // --- background music ---
  private audio = new Audio();
  private i = 0;

  songs: string[] = [
    'songs/gareth.t - honest feat moon tang (official video).mp3',
    'songs/keshi - Soft Spot (Acoustic) Official Audio.mp3',
    'songs/Kiri T - 10,000ft. [Official Music Video].mp3',
    'songs/moon tang X Gordon Flanders - 我想和你好好的【KATCH OUR LIFE_ WARNER! GO!音樂會】.mp3',
    'songs/moon tang & 吳林峰 - 外星人接我們回去 (live acoustic version).mp3'

  ];

  showPlayHint = signal(false);

  ngOnInit(): void {
    // audio setup
    this.audio.preload = 'auto';
    this.audio.loop = false;
    this.audio.volume = 0.6;
    this.audio.addEventListener('ended', () => this.next());

    this.load(this.i);
    this.tryAutoplay();

// gesture unlock (for autoplay restriction)
const gestureStart = () => {
  this.play().finally(() => this.showPlayHint.set(false));
  window.removeEventListener('pointerdown', gestureStart);
  window.removeEventListener('keydown', gestureStart);
  window.removeEventListener('touchstart', gestureStart);
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
    try { await this.audio.play(); }
    catch { this.showPlayHint.set(true); }
  }

  private next() {
    this.load(this.i + 1);
    this.play();
  }
}
