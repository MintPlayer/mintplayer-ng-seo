import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoModule } from '@mintplayer/ng-seo';
import { JsonLdModule } from '@mintplayer/ng-json-ld';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

@NgModule({
  declarations: [HomeComponent],
  imports: [CommonModule, JsonLdModule, SeoModule, HomeRoutingModule],
})
export class HomeModule {}
