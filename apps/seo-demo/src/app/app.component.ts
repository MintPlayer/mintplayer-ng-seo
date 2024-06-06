import { Component } from '@angular/core';
import { PwaService } from '@mintplayer/ng-seo/pwa';

@Component({
  selector: 'mintplayer-ng-seo-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(pwaService: PwaService) {
    this.isPwa = pwaService.isPwa();
  }

  title = 'seo-demo';
  isPwa = false;
}
