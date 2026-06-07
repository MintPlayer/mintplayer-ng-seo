import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { PwaService } from '@mintplayer/ng-seo/pwa';

@Component({
  selector: 'mintplayer-ng-seo-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [RouterOutlet, RouterLink]
})
export class AppComponent {
  constructor() {
    const pwaService = inject(PwaService);

    this.isPwa = pwaService.isPwa();
  }

  title = 'seo-demo';
  isPwa = false;
}
