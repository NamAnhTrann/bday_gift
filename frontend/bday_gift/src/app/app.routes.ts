import { Routes } from '@angular/router';
import { Homepage } from './homepage/homepage';
import { MiniGame } from './mini-game/mini-game';

export const routes: Routes = [
    {path: '', component: Homepage},
    {path: "mini-game", component:MiniGame}
];
