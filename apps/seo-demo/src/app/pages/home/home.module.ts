import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanonicalUrlDirective, HrefLangDirective, SeoDirective } from '@mintplayer/ng-seo';
import { JsonLdDirective } from '@mintplayer/ng-json-ld';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

@NgModule({
  declarations: [HomeComponent],
  imports: [CommonModule, JsonLdDirective, SeoDirective, HrefLangDirective, CanonicalUrlDirective, HomeRoutingModule],
})
export class HomeModule {}
