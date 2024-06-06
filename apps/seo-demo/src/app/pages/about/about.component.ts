import { Component } from '@angular/core';
import { CanonicalUrlDirective } from '@mintplayer/ng-seo/canonical-url';

@Component({
  selector: 'mintplayer-ng-seo-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  standalone: true,
  imports: [CanonicalUrlDirective]
})
export class AboutComponent {
}
