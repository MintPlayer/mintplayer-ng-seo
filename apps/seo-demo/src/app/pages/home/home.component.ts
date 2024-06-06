import { Component } from '@angular/core';
import { CanonicalUrlDirective } from '@mintplayer/ng-seo/canonical-url';
import { HrefLangDirective } from '@mintplayer/ng-seo/href-lang';
import { JsonLdDirective } from '@mintplayer/ng-seo/json-ld';
import { SeoDirective } from '@mintplayer/ng-seo/seo';

@Component({
  selector: 'mintplayer-ng-seo-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [JsonLdDirective, SeoDirective, HrefLangDirective, CanonicalUrlDirective]
})
export class HomeComponent {
  
  counter = 1;

}
