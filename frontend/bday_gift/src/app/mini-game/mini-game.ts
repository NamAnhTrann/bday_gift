import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';

type Balloon = {
  id: number; x: number; y: number; r: number; vy: number;
  color: string; golden: boolean;
};
type Confetti = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; };

@Component({
  selector: 'app-mini-game',
  standalone: true,
  imports: [],
  templateUrl: './mini-game.html',
  styleUrls: ['./mini-game.css']
})
export class MiniGame implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private raf = 0;
  private balloons: Balloon[] = [];
  private confetti: Confetti[] = [];
  private nextId = 1;
  private lastSpawn = 0;
  private spawnEvery = 700; // ms
  private lastPopTime = 0;
  private dpr = 1;

  // UI
  score = signal(0);
  combo = signal(0);
  toastVisible = signal(false);
  toastText = signal('');

  private messages = [
    'i kinda assumed your fav colour is light-blue', 'tbh idk what to write', 'i just figured that making something myself would be mroe meaningful', 'i hope you like the bunny though', 'anyways, HAPPY BIRTHDAY'
  ];
  private goldenMessages = ['Golden moment ', 'Lucky pop!', 'Make a wish ', 'Extra sparkle!'];

  ngOnInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    this.resize();                 // sets width/height & ctx transform
    window.addEventListener('resize', this.resize, { passive: true });

    // best cross-device input
    canvas.addEventListener('pointerdown', this.onPointerDown, { passive: true });

    // spawn a few immediately; some already visible
    const now = performance.now();
    for (let i = 0; i < 6; i++) {
      this.spawnBalloon(now + i * this.spawnEvery, true);
    }

    this.loop(now);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('resize', this.resize);
  }

  // --- Input (CSS pixels) ---
  private onPointerDown = (e: PointerEvent) => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left; // CSS px
    const y = e.clientY - rect.top;  // CSS px

    let hit = false;
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      const dx = x - b.x, dy = y - b.y;
      if (dx*dx + dy*dy <= b.r*b.r) {
        this.balloons.splice(i, 1);
        this.emitConfetti(b.x, b.y, b.golden ? 90 : 40);
        this.pushToast(b.golden ? this.pick(this.goldenMessages) : this.pick(this.messages));
        this.score.update(v => v + (b.golden ? 5 : 1));
        this.updateCombo();
        hit = true;
        break;
      }
    }
    if (!hit) this.combo.set(0);
  };

  private updateCombo() {
    const now = performance.now();
    if (now - this.lastPopTime < 900) this.combo.update(v => v + 1);
    else this.combo.set(1);
    this.lastPopTime = now;
  }

  private pushToast(text: string) {
    this.toastText.set(text);
    this.toastVisible.set(true);
    const ms = 1400 + Math.min(1000, this.combo() * 120);
    setTimeout(() => this.toastVisible.set(false), ms);
  }

  // --- Loop ---
  private loop = (t: number) => {
    this.raf = requestAnimationFrame(this.loop);
    this.spawnBalloon(t);
    this.update();
    this.draw();
  };

  private spawnBalloon(now: number, initial = false) {
    if (!initial && now - this.lastSpawn < this.spawnEvery) return;
    this.lastSpawn = now;

    const canvas = this.canvasRef.nativeElement;
    const W = canvas.width / this.dpr; // CSS px
    const H = canvas.height / this.dpr; // CSS px

    const golden = Math.random() < 0.08; // 8%
    const r = golden ? 28 + Math.random()*6 : 20 + Math.random()*8; // CSS px
    const x = 40 + Math.random() * (W - 80);
    const startBelow = initial ? (H * 0.3 + Math.random() * (H * 0.7)) : (H + r + Math.random() * 40);
    const y = startBelow;
    const vy = -(0.6 + Math.random()*0.8); // CSS px per frame-ish; smooth

    const palette = golden ? ['#fbbf24','#fde68a'] : ['#38bdf8','#0ea5e9','#7dd3fc'];
    const color = this.pick(palette);

    this.balloons.push({ id: this.nextId++, x, y, r, vy, color, golden });
  }

  private update() {
    const canvas = this.canvasRef.nativeElement;
    const H = canvas.height / this.dpr;

    // balloons rise + sway
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.y += b.vy;
      b.x += Math.sin((performance.now()/600) + b.id) * 0.2;
      if (b.y < -b.r - 10) {
        this.balloons.splice(i, 1);
        this.combo.set(0);
      }
    }

    // confetti physics
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.life++;
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.06; // gravity
      if (c.life > c.maxLife) this.confetti.splice(i, 1);
    }
  }

  private draw() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;
    const W = canvas.width;  // device px
    const H = canvas.height; // device px

    ctx.clearRect(0, 0, W, H);

    // draw balloons (coords are CSS px; ctx is scaled)
    for (const b of this.balloons) {
      // string
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.r - 4);
      ctx.lineTo(b.x, b.y + b.r + 24);
      ctx.strokeStyle = b.golden ? 'rgba(245,158,11,0.45)' : 'rgba(14,165,233,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // body
      const grad = ctx.createRadialGradient(
        b.x - b.r*0.3, b.y - b.r*0.3, b.r*0.2,
        b.x, b.y, b.r
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.2, b.golden ? 'rgba(253,230,138,0.95)' : 'rgba(186,230,253,0.95)');
      grad.addColorStop(1, b.color);

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fillStyle = grad;
      ctx.fill();

      // knot
      ctx.beginPath();
      ctx.moveTo(b.x - 3, b.y + b.r - 2);
      ctx.lineTo(b.x + 3, b.y + b.r - 2);
      ctx.lineTo(b.x, b.y + b.r + 4);
      ctx.closePath();
      ctx.fillStyle = b.golden ? '#f59e0b' : '#0ea5e9';
      ctx.fill();
    }

    // confetti
    for (const c of this.confetti) {
      const alpha = 1 - (c.life / c.maxLife);
      ctx.fillStyle = `rgba(14,165,233,${Math.max(0, alpha)})`;
      ctx.fillRect(c.x, c.y, 2, 3);
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

  // --- Sizing: CSS px coords + DPR-scaled canvas ---
  private resize = () => {
    const canvas = this.canvasRef.nativeElement;
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const cssW = Math.floor(window.innerWidth);
    const cssH = Math.floor(window.innerHeight);

    canvas.width  = Math.floor(cssW * this.dpr);
    canvas.height = Math.floor(cssH * this.dpr);

    // set the CSS size explicitly, too
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    // scale all drawing from CSS px -> device px
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
