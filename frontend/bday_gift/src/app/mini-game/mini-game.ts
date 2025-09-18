import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';

type Balloon = {
  id: number; x: number; y: number; r: number; vy: number;
  color: string; golden: boolean; bomb: boolean;
};
type Confetti = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; };
type Toast = { id: number; text: string };  

@Component({
  selector: 'app-mini-game',
  standalone: true,
  imports: [],
  templateUrl: './mini-game.html',
  styleUrls: ['./mini-game.css']
})
export class MiniGame implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // UI state
  score = signal(0);
  combo = signal(0);
  level = signal(1);
  progress = signal(0);

  toasts: Toast[] = [];
  private toastId = 1;

  // canvas state
  private ctx!: CanvasRenderingContext2D;
  private raf = 0;
  private balloons: Balloon[] = [];
  private confetti: Confetti[] = [];
  private nextId = 1;

  // timing
  private lastSpawn = 0;
  private spawnEveryBase = 700;
  private spawnEvery = this.spawnEveryBase;
  private lastPopTime = 0;
  private dpr = 1;

  // level + difficulty
  private speedMultiplier = 1;
  private levelDuration = 20000; // ms per level
  private levelStartTime = 0;

  // --- messages ---
  private messages = [
    'i kinda assumed your fav colour is light-blue',
    'tbh idk what to write',
    'i just figured that making something myself would be mroe meaningful',
    'i hope you like the bunny though',
    'anyways, HAPPY BIRTHDAY'
  ];
  private goldenMessages = ['Golden moment', 'Lucky pop!', 'Make a wish', 'Extra sparkle!'];

  ngOnInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    this.resize();
    window.addEventListener('resize', this.resize, { passive: true });
    canvas.addEventListener('pointerdown', this.onPointerDown, { passive: true });

    // spawn initial balloons
    const now = performance.now();
    for (let i = 0; i < 6; i++) this.spawnBalloon(now + i * this.spawnEvery, true);

    // start first level
    this.startLevel(now);

    this.loop(now);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('resize', this.resize);
  }

  // ---------- Toast Helper ----------
  private showToast(text: string, duration = 3000) {
    const id = this.toastId++;
    this.toasts.push({ id, text });

    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, duration);
  }

  // ---------- level control ----------
  private startLevel(now: number) {
    this.levelStartTime = now;
    this.progress.set(0);

    this.speedMultiplier = 1 + (this.level() - 1) * 0.2;
    this.spawnEvery = Math.max(240, Math.round(this.spawnEveryBase * Math.pow(0.9, this.level() - 1)));

    this.showToast(`🎉 Level ${this.level()} – Get ready!`, 5000);
  }

  private nextLevel(now: number) {
    this.level.update(v => v + 1);
    this.startLevel(now);
  }

  private resetGame(reason: 'miss' | 'escape' | 'manual' = 'miss') {
    this.balloons = [];
    this.confetti = [];
    this.score.set(0);
    this.combo.set(0);
    this.lastSpawn = 0;
    this.level.set(1);

    const now = performance.now();
    for (let i = 0; i < 5; i++) this.spawnBalloon(now + i * this.spawnEvery, true);

    this.startLevel(now);

    if (reason === 'miss') {
      this.showToast("You missed, try again!", 4000);
    }
    if (reason === 'escape') {
      this.showToast("🎈 A balloon escaped! Try again!", 4000);
    }
  }

  // ---------- input ----------
  private onPointerDown = (e: PointerEvent) => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let hit = false;
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      const dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) {
        this.balloons.splice(i, 1);

        if (b.bomb) {
          this.showToast("💥 Boom! Careful!", 3500);
          this.score.update(v => Math.max(0, v - 5));
          this.shakeCanvas();
        } else {
          this.emitConfetti(b.x, b.y, b.golden ? 90 : 40);
          const message = b.golden ? this.pick(this.goldenMessages) : this.pick(this.messages);
          this.showToast(message, 6000);
          this.score.update(v => v + (b.golden ? 5 : 1));
        }

        this.updateCombo();
        hit = true;
        break;
      }
    }

    if (!hit) {
      this.resetGame('miss');
    }
  };

  private updateCombo() {
    const now = performance.now();
    if (now - this.lastPopTime < 900) {
      this.combo.update(v => v + 1);
    } else {
      this.combo.set(1);
    }
    this.lastPopTime = now;
  }

  private shakeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.classList.add('animate-shake');
    setTimeout(() => canvas.classList.remove('animate-shake'), 400);
  }

  // ---------- loop ----------
  private loop = (t: number) => {
    this.raf = requestAnimationFrame(this.loop);
    this.spawnBalloon(t);
    this.update();

    // update level progress
    const elapsed = t - this.levelStartTime;
    this.progress.set(Math.min(100, (elapsed / this.levelDuration) * 100));
    if (elapsed >= this.levelDuration) {
      this.nextLevel(t);
    }

    this.draw();
  };

  // ---------- balloons ----------
  private spawnBalloon(now: number, initial = false) {
    if (!initial && now - this.lastSpawn < this.spawnEvery) return;
    this.lastSpawn = now;

    const canvas = this.canvasRef.nativeElement;
    const W = canvas.width / this.dpr;
    const H = canvas.height / this.dpr;

    const golden = Math.random() < 0.08;
    const bomb = this.level() >= 3 && Math.random() < 0.15;

    const r = bomb ? 24 : (golden ? 28 + Math.random() * 6 : 20 + Math.random() * 8);
    const x = 40 + Math.random() * (W - 80);
    const y = initial ? (H * 0.3 + Math.random() * (H * 0.7)) : (H + r + Math.random() * 40);
    const vy = -(0.6 + Math.random() * 0.8);

    let color: string;
    if (bomb) color = '#1f2937';
    else if (golden) color = this.pick(['#fbbf24', '#fde68a']);
    else color = this.pick(['#38bdf8', '#0ea5e9', '#7dd3fc']);

    this.balloons.push({ id: this.nextId++, x, y, r, vy, color, golden, bomb });
  }

  private update() {
    const canvas = this.canvasRef.nativeElement;
    const H = canvas.height / this.dpr;

    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.y += b.vy * this.speedMultiplier;
      b.x += Math.sin((performance.now() / 600) + b.id) * (0.2 + 0.03 * this.level());

      if (b.y < -b.r - 10) {
        // Balloon escaped → reset game
        this.resetGame('escape');
        return;
      }
    }

    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.life++;
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.06;
      if (c.life > c.maxLife) this.confetti.splice(i, 1);
    }
  }

  private draw() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const b of this.balloons) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.r - 4);
      ctx.lineTo(b.x, b.y + b.r + 24);
      ctx.strokeStyle = b.bomb
        ? 'rgba(31,41,55,0.5)'
        : b.golden ? 'rgba(245,158,11,0.45)' : 'rgba(14,165,233,0.35)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
    }

    for (const c of this.confetti) {
      const alpha = 1 - (c.life / c.maxLife);
      this.ctx.fillStyle = `rgba(14,165,233,${Math.max(0, alpha)})`;
      this.ctx.fillRect(c.x, c.y, 2, 3);
    }
  }

  private emitConfetti(x: number, y: number, amount: number) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2.5;
      this.confetti.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 0,
        maxLife: 45 + Math.random() * 25
      });
    }
  }

  private resize = () => {
    const canvas = this.canvasRef.nativeElement;
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const cssW = Math.floor(window.innerWidth);
    const cssH = Math.floor(window.innerHeight);

    canvas.width = Math.floor(cssW * this.dpr);
    canvas.height = Math.floor(cssH * this.dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
