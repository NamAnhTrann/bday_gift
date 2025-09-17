import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniGame } from './mini-game';

describe('MiniGame', () => {
  let component: MiniGame;
  let fixture: ComponentFixture<MiniGame>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniGame]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiniGame);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
