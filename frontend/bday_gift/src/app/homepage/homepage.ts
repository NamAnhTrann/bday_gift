import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-homepage',
  standalone: true,
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.css']
})
export class Homepage {
  constructor(private router: Router) {}

  // --- UI signals ---
  flip1 = signal(false);
  flip2 = signal(false);

  // --- UI actions ---
  miniGameBtn() {
    this.router.navigate(['/mini-game']);
  }

  toggle1() {
    this.flip1.update(v => !v);
  }

  toggle2() {
    this.flip2.update(v => !v);
  }

  scrollTo(id: string) {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
