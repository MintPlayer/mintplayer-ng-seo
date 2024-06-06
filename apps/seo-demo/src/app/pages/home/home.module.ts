import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoDirective } from '@mintplayer/ng-seo/seo';
import { CanonicalUrlDirective } from '@mintplayer/ng-seo/canonical-url';
import { HrefLangDirective } from '@mintplayer/ng-seo/href-lang';
import { JsonLdDirective } from '@mintplayer/ng-seo/json-ld';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

@NgModule({
  declarations: [HomeComponent],
  imports: [CommonModule, JsonLdDirective, SeoDirective, HrefLangDirective, CanonicalUrlDirective, HomeRoutingModule],
})
export class HomeModule {}
