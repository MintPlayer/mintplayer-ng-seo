import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanonicalUrlDirective } from '@mintplayer/ng-seo/canonical-url';

import { AboutRoutingModule } from './about-routing.module';
import { AboutComponent } from './about.component';

@NgModule({
  declarations: [AboutComponent],
  imports: [CommonModule, CanonicalUrlDirective, AboutRoutingModule],
})
export class AboutModule {}
