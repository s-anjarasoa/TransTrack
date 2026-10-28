import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Loading } from './shared/components/loading/loading';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Loading
  ],
  templateUrl: './app.html',
  //styleUrls: ['./app.scss'],
})
export class App {
  title = 'TransTrack';
}