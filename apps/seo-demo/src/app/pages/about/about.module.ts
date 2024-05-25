import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanonicalUrlDirective } from '@mintplayer/ng-seo';

import { AboutRoutingModule } from './about-routing.module';
import { AboutComponent } from './about.component';

@NgModule({
  declarations: [AboutComponent],
  imports: [CommonModule, CanonicalUrlDirective, AboutRoutingModule],
})
export class AboutModule {}
