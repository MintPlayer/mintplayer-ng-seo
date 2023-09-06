import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoModule } from '@mintplayer/ng-seo';

import { AboutRoutingModule } from './about-routing.module';
import { AboutComponent } from './about.component';

@NgModule({
  declarations: [AboutComponent],
  imports: [CommonModule, SeoModule, AboutRoutingModule],
})
export class AboutModule {}
